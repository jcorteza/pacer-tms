import { useState } from 'react'
import { useAuth } from '../../auth/useAuth.ts'
import { SelectField, TextField } from '../../components/fields.tsx'
import { changedFields, hasErrors, requiredErrors, useForm, type Errors } from '../../components/form.ts'
import { Modal } from '../../components/Modal.tsx'
import { SectionCard } from './SectionCard.tsx'
import { STATES } from './states.ts'
import type { SectionProps, Site } from './types.ts'
import type { User } from '../../auth/session.ts'

type Values = { name: string; address: string; city: string; state: string; zip: string; phone: string; managerId: string }

const LABELS: Record<keyof Values, string> = {
  name: 'Site name',
  address: 'Address',
  city: 'City',
  state: 'State',
  zip: 'ZIP code',
  phone: 'Phone',
  managerId: 'Manager',
}

function validate(values: Values): Errors<Values> {
  const errors = requiredErrors(values, LABELS)
  if (!errors.zip && !/^\d{5}$/.test(values.zip.trim())) errors.zip = 'Enter a 5-digit ZIP code.'
  return errors
}

type DialogProps = { site?: Site; managers: User[]; onClose: () => void; onSaved: () => Promise<void> }

function SiteDialog({ site, managers, onClose, onSaved }: DialogProps) {
  const { api } = useAuth()
  const initial: Values = {
    name: site?.name ?? '',
    address: site?.address ?? '',
    city: site?.city ?? '',
    state: site?.state ?? '',
    zip: site?.zip ?? '',
    phone: site?.phone ?? '',
    managerId: site?.managerId ?? '',
  }
  const { values, errors, setErrors, set } = useForm(initial)
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)

  const submit = async () => {
    const found = validate(values)
    setErrors(found)
    if (hasErrors(found)) return
    setBusy(true)
    setFailure(null)
    try {
      if (site) {
        const changes = changedFields(values, initial)
        if (Object.keys(changes).length > 0) await api.patch(`/warehouse-codes/${site.id}`, changes)
      } else {
        await api.post('/warehouse-codes', Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v.trim()])))
      }
      await onSaved()
    } catch {
      setFailure('Could not save the site. Try again.')
      setBusy(false)
    }
  }

  return (
    <Modal title={site ? 'Edit site' : 'Add site'} submitLabel={site ? 'Save' : 'Add site'} busy={busy} error={failure} onSubmit={() => void submit()} onClose={onClose}>
      <TextField label="Site name" required value={values.name} onChange={set('name')} error={errors.name} />
      <TextField label="Address" required value={values.address} onChange={set('address')} error={errors.address} />
      <TextField label="City" required value={values.city} onChange={set('city')} error={errors.city} />
      <div className="row">
        <SelectField label="State" required placeholder="Select state" options={STATES} value={values.state} onChange={set('state')} error={errors.state} />
        <TextField label="ZIP code" required inputMode="numeric" value={values.zip} onChange={set('zip')} error={errors.zip} />
      </div>
      <TextField label="Phone" required type="tel" value={values.phone} onChange={set('phone')} error={errors.phone} />
      <SelectField
        label="Manager"
        required
        placeholder="Select manager"
        options={managers.map((m) => ({ value: m.id, label: `${m.firstName} ${m.lastName}` }))}
        value={values.managerId}
        onChange={set('managerId')}
        error={errors.managerId}
      />
    </Modal>
  )
}

export function SitesSection({ data, reload }: SectionProps) {
  // `true` is the Add dialog; a site is the Edit dialog for that site.
  const [dialog, setDialog] = useState<true | Site | null>(null)
  const close = () => setDialog(null)
  const buildingCount = (siteId: number) => data.buildings.filter((b) => b.warehouseId === siteId).length

  return (
    <>
      <SectionCard id="sites" title="Sites" caption="Warehouse sites and compounds." addLabel="Add site" onAdd={() => setDialog(true)}>
        <table className="table">
          <thead>
            <tr>
              <th>Site</th>
              <th>Address</th>
              <th>City</th>
              <th>State</th>
              <th>ZIP</th>
              <th>Buildings</th>
              <th>
                <span className="visually-hidden">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {data.sites.map((site) => (
              <tr key={site.id}>
                <td className="strong">{site.name}</td>
                <td>{site.address}</td>
                <td>{site.city}</td>
                <td>{site.state}</td>
                <td className="num">{site.zip}</td>
                <td className="num">{buildingCount(site.id)}</td>
                <td className="end">
                  <button className="link-btn" type="button" aria-label={`Edit ${site.name}`} onClick={() => setDialog(site)}>
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
      {dialog && (
        <SiteDialog
          site={dialog === true ? undefined : dialog}
          managers={data.managers}
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
