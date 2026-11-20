import { useState } from 'react'
import { useAuth } from '../../auth/useAuth.ts'
import { SelectField, TextField } from '../../components/fields.tsx'
import { changedFields, hasErrors, requiredErrors, useForm } from '../../components/form.ts'
import { Modal } from '../../components/Modal.tsx'
import { SectionCard } from './SectionCard.tsx'
import type { Building, ConfigData, SectionProps } from './types.ts'

const TYPES = [
  { value: 'storage', label: 'Storage' },
  { value: 'transport', label: 'Transport' },
]
const typeLabel = (type: Building['type']) => TYPES.find((t) => t.value === type)!.label

type DialogProps = { building?: Building; sites: ConfigData['sites']; onClose: () => void; onSaved: () => Promise<void> }

function BuildingDialog({ building, sites, onClose, onSaved }: DialogProps) {
  const { api } = useAuth()
  const initial = {
    warehouseId: building ? String(building.warehouseId) : '',
    name: building?.name ?? '',
    type: building?.type ?? 'storage',
  }
  const { values, errors, setErrors, set } = useForm<Record<keyof typeof initial, string>>(initial)
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)

  const submit = async () => {
    const found = requiredErrors(values, { warehouseId: 'Site', name: 'Building name', type: 'Type' })
    setErrors(found)
    if (hasErrors(found)) return
    setBusy(true)
    setFailure(null)
    try {
      const toBody = (fields: Partial<typeof values>) => ({
        ...fields,
        ...(fields.warehouseId !== undefined && { warehouseId: Number(fields.warehouseId) }),
        ...(fields.name !== undefined && { name: fields.name.trim() }),
      })
      if (building) {
        const changes = changedFields(values, initial)
        if (Object.keys(changes).length > 0) await api.patch(`/building-codes/${building.id}`, toBody(changes))
      } else {
        await api.post('/building-codes', toBody(values))
      }
      await onSaved()
    } catch {
      setFailure('Could not save the building. Try again.')
      setBusy(false)
    }
  }

  return (
    <Modal title={building ? 'Edit building' : 'Add building'} submitLabel={building ? 'Save' : 'Add building'} busy={busy} error={failure} onSubmit={() => void submit()} onClose={onClose}>
      <SelectField
        label="Site"
        required
        placeholder="Select site"
        options={sites.map((s) => ({ value: String(s.id), label: s.name }))}
        value={values.warehouseId}
        onChange={set('warehouseId')}
        error={errors.warehouseId}
      />
      <TextField label="Building name" required value={values.name} onChange={set('name')} error={errors.name} />
      <SelectField label="Type" required options={TYPES} value={values.type} onChange={set('type')} error={errors.type} />
    </Modal>
  )
}

export function BuildingsSection({ data, reload }: SectionProps) {
  const [dialog, setDialog] = useState<true | Building | null>(null)
  const close = () => setDialog(null)
  const siteName = (id: number) => data.sites.find((s) => s.id === id)?.name ?? ''

  return (
    <>
      <SectionCard
        id="buildings"
        title="Buildings"
        caption="A site can have one building or several storage and transport buildings."
        addLabel="Add building"
        onAdd={() => setDialog(true)}
      >
        <table className="table">
          <thead>
            <tr>
              <th>Site</th>
              <th>Building</th>
              <th>Type</th>
              <th>
                <span className="visually-hidden">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {data.buildings.map((building) => (
              <tr key={building.id}>
                <td className="strong">{siteName(building.warehouseId)}</td>
                <td>{building.name}</td>
                <td>{typeLabel(building.type)}</td>
                <td className="end">
                  <button
                    className="link-btn"
                    type="button"
                    aria-label={`Edit ${siteName(building.warehouseId)} ${building.name}`}
                    onClick={() => setDialog(building)}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
      {dialog && (
        <BuildingDialog
          building={dialog === true ? undefined : dialog}
          sites={data.sites}
          onClose={close}
          onSaved={async () => {
            await reload()
            close()
          }}
        />
      )}
    </>
  )
}
