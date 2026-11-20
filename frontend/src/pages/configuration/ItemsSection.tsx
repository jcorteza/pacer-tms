import { useState } from 'react'
import { useAuth } from '../../auth/useAuth.ts'
import { SelectField, TextField, type Option } from '../../components/fields.tsx'
import { changedFields, hasErrors, requiredErrors, useForm, type Errors } from '../../components/form.ts'
import { Modal } from '../../components/Modal.tsx'
import { SectionCard } from './SectionCard.tsx'
import type { ConfigData, Item, ItemLocation, SectionProps } from './types.ts'

const NONE = 'none'
const NEW = 'new'

type Values = {
  name: string
  clientId: string
  sku: string
  weightLbs: string
  lengthIn: string
  widthIn: string
  heightIn: string
  cost: string
  location: string
  newSite: string
  newBuilding: string
  newSpot: string
}
type ItemFields = Exclude<keyof Values, 'location' | 'newSite' | 'newBuilding' | 'newSpot'>

const ITEM_LABELS: Record<ItemFields, string> = {
  name: 'Item name',
  clientId: 'Client',
  sku: 'SKU',
  weightLbs: 'Weight',
  lengthIn: 'Length',
  widthIn: 'Width',
  heightIn: 'Height',
  cost: 'Cost',
}
const NUMBER_FIELDS: ItemFields[] = ['weightLbs', 'lengthIn', 'widthIn', 'heightIn', 'cost']

function validate(values: Values): Errors<Values> {
  const errors: Errors<Values> = requiredErrors(values, ITEM_LABELS)
  for (const key of NUMBER_FIELDS) {
    const value = values[key].trim()
    if (!errors[key] && !(/^\d*\.?\d+$/.test(value) && Number(value) > 0)) errors[key] = `${ITEM_LABELS[key]} must be a positive number.`
  }
  if (values.location === NEW) {
    Object.assign(errors, requiredErrors(values, { newSite: 'Site', newBuilding: 'Building', newSpot: 'Spot or rack' }))
  }
  return errors
}

/** "Central DC · Building A · Aisle 4 · Rack C · Shelf 2" */
function describe(location: ItemLocation, data: ConfigData) {
  const building = data.buildings.find((b) => b.id === location.buildingId)
  const site = data.sites.find((s) => s.id === building?.warehouseId)
  return [site?.name, building?.name, location.description ?? location.code].filter(Boolean).join(' · ')
}

type DialogProps = { item?: Item; data: ConfigData; onClose: () => void; onChanged: () => Promise<void>; onSaved: () => Promise<void> }

function ItemDialog({ item, data, onClose, onChanged, onSaved }: DialogProps) {
  const { api } = useAuth()
  const current = item && data.locations.find((l) => l.itemId === item.id)
  const initial: Values = {
    name: item?.name ?? '',
    clientId: item?.clientId ?? '',
    sku: item?.sku ?? '',
    weightLbs: item?.weightLbs ?? '',
    lengthIn: item?.lengthIn ?? '',
    widthIn: item?.widthIn ?? '',
    heightIn: item?.heightIn ?? '',
    cost: item?.cost ?? '',
    location: current ? String(current.id) : NONE,
    newSite: '',
    newBuilding: '',
    newSpot: '',
  }
  const { values, setValues, errors, setErrors, set } = useForm(initial)
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)
  /** Set once the item exists but its location failed, so submitting again cannot create it twice. */
  const [partial, setPartial] = useState(false)

  const locationOptions: Option[] = [
    { value: NONE, label: 'None' },
    ...(current ? [{ value: String(current.id), label: describe(current, data) }] : []),
    ...data.locations.filter((l) => l.itemId === null).map((l) => ({ value: String(l.id), label: describe(l, data) })),
    { value: NEW, label: 'Add new location…' },
  ]
  const buildingOptions = data.buildings
    .filter((b) => String(b.warehouseId) === values.newSite)
    .map((b) => ({ value: String(b.id), label: b.name }))

  /** Puts the item in the chosen location: an existing free one, or a new one. */
  const place = async (itemId: number) => {
    if (values.location === NONE) return
    if (values.location === NEW) {
      await api.post('/item-locations', { buildingId: Number(values.newBuilding), itemId, description: values.newSpot.trim() })
    } else {
      await api.patch(`/item-locations/${values.location}`, { itemId })
    }
  }

  const submit = async () => {
    const found = validate(values)
    setErrors(found)
    if (hasErrors(found)) return
    setBusy(true)
    setFailure(null)

    const trimmed = (fields: Partial<Values>) => Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, v.trim()]))
    const itemFields = Object.fromEntries(Object.keys(ITEM_LABELS).map((k) => [k, values[k as ItemFields]])) as Values
    const initialItemFields = Object.fromEntries(Object.keys(ITEM_LABELS).map((k) => [k, initial[k as ItemFields]])) as Values

    try {
      if (item) {
        const changes = changedFields(itemFields, initialItemFields)
        if (Object.keys(changes).length > 0) await api.patch(`/items/${item.id}`, trimmed(changes))
        if (values.location !== initial.location) {
          // An item has one location, so it must leave the old one before taking another.
          if (current) await api.patch(`/item-locations/${current.id}`, { itemId: null })
          await place(item.id)
        }
      } else {
        const created = await api.post<{ id: number }>('/items', trimmed(itemFields))
        try {
          await place(created.id)
        } catch {
          await onChanged()
          setPartial(true)
          setFailure('The item was saved, but its location could not be saved. Close this window and edit the item to set its location.')
          setBusy(false)
          return
        }
      }
      await onSaved()
    } catch {
      setFailure('Could not save the item. Try again.')
      setBusy(false)
    }
  }

  return (
    <Modal
      title={item ? 'Edit item' : 'Add item'}
      submitLabel={item ? 'Save' : 'Add item'}
      busy={busy}
      submitDisabled={partial}
      error={failure}
      onSubmit={() => void submit()}
      onClose={onClose}
    >
      <TextField label="Item name" required value={values.name} onChange={set('name')} error={errors.name} />
      <SelectField
        label="Client"
        required
        placeholder="Select client"
        options={data.clients.map((c) => ({ value: c.id, label: c.name }))}
        value={values.clientId}
        onChange={set('clientId')}
        error={errors.clientId}
      />
      <TextField label="SKU" required value={values.sku} onChange={set('sku')} error={errors.sku} />
      <div className="row">
        <TextField label="Weight in lbs" required inputMode="decimal" value={values.weightLbs} onChange={set('weightLbs')} error={errors.weightLbs} />
        <TextField label="Cost" required inputMode="decimal" value={values.cost} onChange={set('cost')} error={errors.cost} />
      </div>
      <div className="row">
        <TextField label="Length in inches" required inputMode="decimal" value={values.lengthIn} onChange={set('lengthIn')} error={errors.lengthIn} />
        <TextField label="Width in inches" required inputMode="decimal" value={values.widthIn} onChange={set('widthIn')} error={errors.widthIn} />
        <TextField label="Height in inches" required inputMode="decimal" value={values.heightIn} onChange={set('heightIn')} error={errors.heightIn} />
      </div>
      <SelectField label="Location" optional options={locationOptions} value={values.location} onChange={set('location')} />
      {values.location === NEW && (
        <>
          <div className="row">
            <SelectField
              label="Site"
              required
              placeholder="Select site"
              options={data.sites.map((s) => ({ value: String(s.id), label: s.name }))}
              value={values.newSite}
              onChange={(site) => setValues((v) => ({ ...v, newSite: site, newBuilding: '' }))}
              error={errors.newSite}
            />
            <SelectField
              label="Building"
              required
              placeholder="Select building"
              options={buildingOptions}
              value={values.newBuilding}
              onChange={set('newBuilding')}
              error={errors.newBuilding}
              hint="Buildings listed are the ones at the selected site."
            />
          </div>
          <TextField
            label="Spot or rack"
            required
            value={values.newSpot}
            onChange={set('newSpot')}
            error={errors.newSpot}
            hint="Aisle, rack and shelf, for example Aisle 4 · Rack C · Shelf 2."
          />
        </>
      )}
    </Modal>
  )
}

export function ItemsSection({ data, reload }: SectionProps) {
  const [dialog, setDialog] = useState<true | Item | null>(null)
  const close = () => setDialog(null)

  const rows = data.items.map((item) => {
    const location = data.locations.find((l) => l.itemId === item.id)
    const building = data.buildings.find((b) => b.id === location?.buildingId)
    const site = data.sites.find((s) => s.id === building?.warehouseId)
    return { item, location, building, site }
  })

  return (
    <>
      <SectionCard
        id="items"
        title="Item locations"
        caption="Where each item is kept: site, building and exact spot or rack."
        addLabel="Add item"
        onAdd={() => setDialog(true)}
      >
        <table className="table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Site</th>
              <th>Building</th>
              <th>Spot or rack</th>
              <th>
                <span className="visually-hidden">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ item, location, building, site }) => (
              <tr key={item.id}>
                <td>
                  <span className="strong">{item.name}</span>
                  <div className="caption num">{item.sku}</div>
                </td>
                <td>{site?.name ?? '—'}</td>
                <td>{building?.name ?? '—'}</td>
                <td>{location ? (location.description ?? location.code) : 'No location'}</td>
                <td className="end">
                  <button className="link-btn" type="button" aria-label={`Edit ${item.name}`} onClick={() => setDialog(item)}>
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
      {dialog && (
        <ItemDialog
          item={dialog === true ? undefined : dialog}
          data={data}
          onClose={close}
          onChanged={reload}
          onSaved={async () => {
            await reload()
            close()
          }}
        />
      )}
    </>
  )
}
