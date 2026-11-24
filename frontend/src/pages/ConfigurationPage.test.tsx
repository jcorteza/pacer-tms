import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import type { Session } from '../auth/session.ts'
import { serveConfiguration } from '../test/api.ts'
import { accountingManagerSession, operationsManagerSession, warehouseManagerSession } from '../test/fixtures.ts'
import { renderApp } from '../test/render.tsx'
import { server } from '../test/server.ts'

type User = ReturnType<typeof userEvent.setup>

const region = (name: string) => screen.getByRole('region', { name })
const dialog = () => screen.getByRole('dialog')
/** A dialog closes once the table has reloaded, so wait for it. */
const noDialog = () => waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

async function open(route = '/configuration', options: Parameters<typeof serveConfiguration>[0] = {}) {
  const api = serveConfiguration(options)
  const user = userEvent.setup()
  renderApp(route, { session: warehouseManagerSession })
  await within(await screen.findByRole('region', { name: 'Sites' })).findByText('Central DC')
  return { api, user }
}

const openDialog = async (user: User, buttonName: string) => {
  await user.click(screen.getByRole('button', { name: buttonName }))
  return within(await screen.findByRole('dialog'))
}
const submit = (user: User, name: string) => user.click(within(dialog()).getByRole('button', { name }))

describe('configuration page', () => {
  describe('layout', () => {
    it('has a section for sites, buildings and item locations', async () => {
      await open()

      for (const name of ['Sites', 'Buildings', 'Item locations']) {
        expect(region(name)).toBeInTheDocument()
        expect(screen.getByRole('link', { name })).toHaveAttribute('href', `#${name === 'Item locations' ? 'items' : name.toLowerCase()}`)
      }
    })

    it('given the server fails, says the data could not be loaded', async () => {
      server.use(http.get('*/api/*', () => new HttpResponse(null, { status: 500 })))
      renderApp('/configuration', { session: warehouseManagerSession })

      expect(await screen.findByRole('alert')).toHaveTextContent(/could not load/i)
    })
  })

  describe('who sees what', () => {
    it.each([
      ['Operations Management', operationsManagerSession],
      ['Warehouse Management', warehouseManagerSession],
    ])('given %s, shows the sites, buildings and item locations sections', async (_role: string, session: Session) => {
      serveConfiguration()
      renderApp('/configuration', { session })

      await within(await screen.findByRole('region', { name: 'Sites' })).findByText('Central DC')
      for (const name of ['Sites', 'Buildings', 'Item locations']) expect(region(name)).toBeInTheDocument()
    })

    it('given Accounting Management, shows the page name and a placeholder, with no sections and nothing loaded', async () => {
      const api = serveConfiguration()
      renderApp('/configuration', { session: accountingManagerSession })

      expect(await screen.findByRole('heading', { level: 1, name: 'Configuration' })).toBeInTheDocument()
      expect(screen.getByText(/nothing to see here/i)).toBeInTheDocument()
      for (const name of ['Sites', 'Buildings', 'Item locations']) {
        expect(screen.queryByRole('region', { name })).not.toBeInTheDocument()
        expect(screen.queryByRole('link', { name })).not.toBeInTheDocument()
      }
      await new Promise((resolve) => setTimeout(resolve, 50)) // long enough for a stray request to show up
      expect(api.log).toHaveLength(0)
    })

    it('given no management role, sends them to the first page in the nav instead', async () => {
      serveConfiguration()
      renderApp('/configuration')

      expect(await screen.findByRole('heading', { level: 1, name: 'Shipments' })).toBeInTheDocument()
      expect(screen.queryByRole('heading', { level: 1, name: 'Configuration' })).not.toBeInTheDocument()
    })
  })

  describe('sites table', () => {
    it('lists each site with its address and how many buildings it has', async () => {
      await open()

      const sites = within(region('Sites'))
      const central = within(sites.getByRole('row', { name: /Central DC/ }))
      expect(central.getByText('1200 Industrial Pkwy')).toBeInTheDocument()
      expect(central.getByText('Columbus')).toBeInTheDocument()
      expect(central.getByText('OH')).toBeInTheDocument()
      expect(central.getByText('43228')).toBeInTheDocument()
      expect(central.getByRole('cell', { name: '3' })).toBeInTheDocument()
      expect(within(sites.getByRole('row', { name: /Northgate Depot/ })).getByRole('cell', { name: '1' })).toBeInTheDocument()
    })

    it('reads every page of the list', async () => {
      await open('/configuration', { pageSize: 1 })

      expect(within(region('Sites')).getByText('Northgate Depot')).toBeInTheDocument()
    })
  })

  describe('add site', () => {
    it('opens a dialog, focuses its first field, and offers Warehouse Management users as managers', async () => {
      const { user } = await open()

      const form = await openDialog(user, 'Add site')

      expect(dialog()).toHaveAccessibleName('Add site')
      expect(form.getByLabelText(/^site name/i)).toHaveFocus()
      const managers = within(form.getByLabelText(/^manager/i)).getAllByRole('option').map((o) => o.textContent)
      expect(managers).toEqual(expect.arrayContaining(['Priya Nair', 'Gareth Lindqvist']))
    })

    it('creates the site without a code (the server numbers it) and shows it in the table', async () => {
      const { api, user } = await open()
      const form = await openDialog(user, 'Add site')

      await user.type(form.getByLabelText(/^site name/i), 'Eastside Cross-dock')
      await user.type(form.getByLabelText(/^address/i), '450 Rail St')
      await user.type(form.getByLabelText(/^city/i), 'Pittsburgh')
      await user.selectOptions(form.getByLabelText(/^state/i), 'Pennsylvania')
      await user.type(form.getByLabelText(/^zip code/i), '15201')
      await user.type(form.getByLabelText(/^phone/i), '412-555-0120')
      await user.selectOptions(form.getByLabelText(/^manager/i), 'Gareth Lindqvist')
      await submit(user, 'Add site')

      expect(await within(region('Sites')).findByText('Eastside Cross-dock')).toBeInTheDocument()
      await noDialog()
      expect(api.calls('POST', '/warehouse-codes')[0].body).toEqual({
        name: 'Eastside Cross-dock',
        address: '450 Rail St',
        city: 'Pittsburgh',
        state: 'PA',
        zip: '15201',
        phone: '412-555-0120',
        managerId: 'u-gareth',
      })
    })

    it('given missing fields, marks them and sends nothing', async () => {
      const { api, user } = await open()
      await openDialog(user, 'Add site')

      await submit(user, 'Add site')

      expect(await within(dialog()).findAllByText(/is required/i)).not.toHaveLength(0)
      expect(api.calls('POST', '/warehouse-codes')).toHaveLength(0)
      expect(dialog()).toBeInTheDocument()
    })

    it('given a ZIP code that is not 5 digits, says so', async () => {
      const { api, user } = await open()
      const form = await openDialog(user, 'Add site')
      await user.type(form.getByLabelText(/^site name/i), 'X')
      await user.type(form.getByLabelText(/^address/i), 'X')
      await user.type(form.getByLabelText(/^city/i), 'X')
      await user.selectOptions(form.getByLabelText(/^state/i), 'Ohio')
      await user.type(form.getByLabelText(/^zip code/i), '12')
      await user.type(form.getByLabelText(/^phone/i), '1')
      await user.selectOptions(form.getByLabelText(/^manager/i), 'Priya Nair')

      await submit(user, 'Add site')

      expect(await form.findByText(/5-digit zip/i)).toBeInTheDocument()
      expect(api.calls('POST', '/warehouse-codes')).toHaveLength(0)
    })

    it('given the server refuses, keeps the dialog open and shows the failure', async () => {
      const { api, user } = await open()
      api.failNext('POST', 'warehouse-codes', 500)
      const form = await openDialog(user, 'Add site')
      await user.type(form.getByLabelText(/^site name/i), 'Eastside')
      await user.type(form.getByLabelText(/^address/i), '450 Rail St')
      await user.type(form.getByLabelText(/^city/i), 'Pittsburgh')
      await user.selectOptions(form.getByLabelText(/^state/i), 'Pennsylvania')
      await user.type(form.getByLabelText(/^zip code/i), '15201')
      await user.type(form.getByLabelText(/^phone/i), '412-555-0120')
      await user.selectOptions(form.getByLabelText(/^manager/i), 'Priya Nair')

      await submit(user, 'Add site')

      expect(await form.findByRole('alert')).toHaveTextContent(/could not save/i)
      expect(dialog()).toBeInTheDocument()
    })

    it.each([
      ['Cancel', (user: User) => user.click(within(dialog()).getByRole('button', { name: 'Cancel' }))],
      ['Close', (user: User) => user.click(within(dialog()).getByRole('button', { name: 'Close' }))],
      ['Escape', (user: User) => user.keyboard('{Escape}')],
    ])('closes with %s without saving, and returns focus to the Add site button', async (_how, close) => {
      const { api, user } = await open()
      await openDialog(user, 'Add site')

      await close(user)

      await noDialog()
      expect(api.calls('POST', '/warehouse-codes')).toHaveLength(0)
      expect(screen.getByRole('button', { name: 'Add site' })).toHaveFocus()
    })
  })

  describe('edit site', () => {
    it('opens the dialog with the current values and saves only what changed', async () => {
      const { api, user } = await open()

      const form = await openDialog(user, 'Edit Central DC')
      expect(dialog()).toHaveAccessibleName('Edit site')
      expect(form.getByLabelText(/^site name/i)).toHaveValue('Central DC')
      expect(form.getByLabelText(/^state/i)).toHaveValue('OH')
      expect(form.getByLabelText(/^manager/i)).toHaveDisplayValue('Priya Nair')

      await user.clear(form.getByLabelText(/^site name/i))
      await user.type(form.getByLabelText(/^site name/i), 'Central Distribution')
      await submit(user, 'Save')

      expect(await within(region('Sites')).findByText('Central Distribution')).toBeInTheDocument()
      expect(api.calls('PATCH', '/warehouse-codes/1')[0].body).toEqual({ name: 'Central Distribution' })
      await noDialog()
    })
  })

  describe('buildings table', () => {
    it('lists each building with its site and type', async () => {
      await open()

      const rows = within(region('Buildings'))
      expect(within(rows.getByRole('row', { name: /Building C/ })).getByText('Central DC')).toBeInTheDocument()
      expect(within(rows.getByRole('row', { name: /Building C/ })).getByText('Transport')).toBeInTheDocument()
      expect(within(rows.getByRole('row', { name: /Main building/ })).getByText('Northgate Depot')).toBeInTheDocument()
      expect(within(rows.getByRole('row', { name: /Main building/ })).getByText('Storage')).toBeInTheDocument()
    })
  })

  describe('add building', () => {
    it('creates the building for the chosen site and shows it', async () => {
      const { api, user } = await open()
      const form = await openDialog(user, 'Add building')
      expect(form.getByLabelText(/^type/i)).toHaveDisplayValue('Storage')

      await user.selectOptions(form.getByLabelText(/^site/i), 'Northgate Depot')
      await user.type(form.getByLabelText(/^building name/i), 'Annex')
      await user.selectOptions(form.getByLabelText(/^type/i), 'Transport')
      await submit(user, 'Add building')

      expect(await within(region('Buildings')).findByText('Annex')).toBeInTheDocument()
      expect(api.calls('POST', '/building-codes')[0].body).toEqual({ warehouseId: 2, name: 'Annex', type: 'transport' })
      await noDialog()
    })

    it('given no site or name, marks them and sends nothing', async () => {
      const { api, user } = await open()
      await openDialog(user, 'Add building')

      await submit(user, 'Add building')

      expect(await within(dialog()).findAllByText(/is required/i)).not.toHaveLength(0)
      expect(api.calls('POST', '/building-codes')).toHaveLength(0)
    })
  })

  describe('edit building', () => {
    it('saves only what changed', async () => {
      const { api, user } = await open()
      const form = await openDialog(user, 'Edit Central DC Building A')
      expect(dialog()).toHaveAccessibleName('Edit building')

      await user.selectOptions(form.getByLabelText(/^type/i), 'Transport')
      await submit(user, 'Save')

      await waitFor(() => expect(api.calls('PATCH', '/building-codes/1')).toHaveLength(1))
      expect(api.calls('PATCH', '/building-codes/1')[0].body).toEqual({ type: 'transport' })
      await noDialog()
    })
  })

  describe('item locations table', () => {
    it('shows each item with its site, building and spot', async () => {
      await open()

      const tent = within(screen.getByRole('row', { name: /Alpine 2-Person Tent/ }))
      expect(tent.getByText('SUM-100')).toBeInTheDocument()
      expect(tent.getByText('Central DC')).toBeInTheDocument()
      expect(tent.getByText('Building A')).toBeInTheDocument()
      expect(tent.getByText('Aisle 4 · Rack C · Shelf 2')).toBeInTheDocument()
    })

    it('shows an item with no location as having none', async () => {
      await open()

      expect(within(screen.getByRole('row', { name: /Oak Dining Table/ })).getByText(/no location/i)).toBeInTheDocument()
    })
  })

  describe('add item', () => {
    const fillItem = async (form: ReturnType<typeof within>, user: User) => {
      await user.type(form.getByLabelText(/^item name/i), 'Camp Chair')
      // By value: user-event matches visible text against innerHTML, which escapes the ampersand.
      await user.selectOptions(form.getByLabelText(/^client/i), 'c-harbor')
      await user.type(form.getByLabelText(/^sku/i), 'HAR-200')
      await user.type(form.getByLabelText(/^weight/i), '12.5')
      await user.type(form.getByLabelText(/^length/i), '30')
      await user.type(form.getByLabelText(/^width/i), '20')
      await user.type(form.getByLabelText(/^height/i), '35')
      await user.type(form.getByLabelText(/^cost/i), '24.99')
    }
    const itemBody = {
      name: 'Camp Chair',
      clientId: 'c-harbor',
      sku: 'HAR-200',
      weightLbs: '12.5',
      lengthIn: '30',
      widthIn: '20',
      heightIn: '35',
      cost: '24.99',
    }

    it('offers no location, the free locations, and adding a new one', async () => {
      const { user } = await open()

      const form = await openDialog(user, 'Add item')

      const select = form.getByLabelText(/^location/i)
      expect(select).toHaveDisplayValue('None')
      expect(within(select).getAllByRole('option').map((o) => o.textContent)).toEqual([
        'None',
        'Central DC · Building B · Aisle 1 · Rack A · Shelf 1',
        'Add new location…',
      ])
    })

    it('given no location, creates only the item', async () => {
      const { api, user } = await open()
      const form = await openDialog(user, 'Add item')
      await fillItem(form, user)

      await submit(user, 'Add item')

      expect(await within(region('Item locations')).findByText('Camp Chair')).toBeInTheDocument()
      expect(api.calls('POST', '/items')[0].body).toEqual(itemBody)
      expect(api.calls('POST', '/item-locations')).toHaveLength(0)
      expect(api.log.filter((r) => r.method === 'PATCH')).toHaveLength(0)
      await noDialog()
    })

    it('given a free location, creates the item and puts it in that location', async () => {
      const { api, user } = await open()
      const form = await openDialog(user, 'Add item')
      await fillItem(form, user)

      await user.selectOptions(form.getByLabelText(/^location/i), 'Central DC · Building B · Aisle 1 · Rack A · Shelf 1')
      await submit(user, 'Add item')

      const row = within(await screen.findByRole('row', { name: /Camp Chair/ }))
      expect(await row.findByText('Aisle 1 · Rack A · Shelf 1')).toBeInTheDocument()
      const created = api.tables.items.find((i) => i.name === 'Camp Chair')!
      expect(api.calls('PATCH', '/item-locations/3')[0].body).toEqual({ itemId: created.id })
    })

    it('given a new location, asks for site, building and spot, then creates the item and the location', async () => {
      const { api, user } = await open()
      const form = await openDialog(user, 'Add item')
      await fillItem(form, user)
      expect(form.queryByLabelText(/^spot or rack/i)).not.toBeInTheDocument()

      await user.selectOptions(form.getByLabelText(/^location/i), 'Add new location…')
      await user.selectOptions(form.getByLabelText(/^site/i), 'Central DC')
      const buildings = within(form.getByLabelText(/^building/i)).getAllByRole('option').map((o) => o.textContent)
      expect(buildings).toEqual(expect.arrayContaining(['Building A', 'Building B', 'Building C']))
      expect(buildings).not.toContain('Main building')
      await user.selectOptions(form.getByLabelText(/^building/i), 'Building C')
      await user.type(form.getByLabelText(/^spot or rack/i), 'Dock door 3')
      await submit(user, 'Add item')

      const row = within(await screen.findByRole('row', { name: /Camp Chair/ }))
      expect(await row.findByText('Dock door 3')).toBeInTheDocument()
      const created = api.tables.items.find((i) => i.name === 'Camp Chair')!
      expect(api.calls('POST', '/item-locations')[0].body).toEqual({ buildingId: 3, itemId: created.id, description: 'Dock door 3' })
    })

    it('given a new location with the spot missing, sends nothing, not even the item', async () => {
      const { api, user } = await open()
      const form = await openDialog(user, 'Add item')
      await fillItem(form, user)
      await user.selectOptions(form.getByLabelText(/^location/i), 'Add new location…')

      await submit(user, 'Add item')

      expect(await form.findAllByText(/is required/i)).not.toHaveLength(0)
      expect(api.calls('POST', '/items')).toHaveLength(0)
    })

    it('given the item saves but its location does not, says so and still lists the item', async () => {
      const { api, user } = await open()
      api.failNext('PATCH', 'item-locations', 500)
      const form = await openDialog(user, 'Add item')
      await fillItem(form, user)
      await user.selectOptions(form.getByLabelText(/^location/i), 'Central DC · Building B · Aisle 1 · Rack A · Shelf 1')

      await submit(user, 'Add item')

      expect(await form.findByRole('alert')).toHaveTextContent(/item was saved, but its location could not be saved/i)
      expect(within(region('Item locations')).getByText('Camp Chair')).toBeInTheDocument()
    })

    it('given missing item details, marks them and sends nothing', async () => {
      const { api, user } = await open()
      await openDialog(user, 'Add item')

      await submit(user, 'Add item')

      expect(await within(dialog()).findAllByText(/is required/i)).not.toHaveLength(0)
      expect(api.calls('POST', '/items')).toHaveLength(0)
    })

    it('given a weight or size that is not a positive number, says so', async () => {
      const { api, user } = await open()
      const form = await openDialog(user, 'Add item')
      await fillItem(form, user)
      await user.clear(form.getByLabelText(/^weight/i))
      await user.type(form.getByLabelText(/^weight/i), '-3')

      await submit(user, 'Add item')

      expect(await form.findByText(/must be a positive number/i)).toBeInTheDocument()
      expect(api.calls('POST', '/items')).toHaveLength(0)
    })
  })

  describe('edit item', () => {
    it('shows the current location selected and saves only what changed', async () => {
      const { api, user } = await open()

      const form = await openDialog(user, 'Edit Alpine 2-Person Tent')
      expect(dialog()).toHaveAccessibleName('Edit item')
      expect(form.getByLabelText(/^item name/i)).toHaveValue('Alpine 2-Person Tent')
      expect(form.getByLabelText(/^location/i)).toHaveDisplayValue('Central DC · Building A · Aisle 4 · Rack C · Shelf 2')

      await user.clear(form.getByLabelText(/^item name/i))
      await user.type(form.getByLabelText(/^item name/i), 'Alpine Tent')
      await submit(user, 'Save')

      expect(await within(region('Item locations')).findByText('Alpine Tent')).toBeInTheDocument()
      expect(api.calls('PATCH', '/items/1')[0].body).toEqual({ name: 'Alpine Tent' })
      expect(api.calls('PATCH', '/item-locations/1')).toHaveLength(0)
    })

    it('moves the item to a free location, freeing the old one', async () => {
      const { api, user } = await open()
      const form = await openDialog(user, 'Edit Alpine 2-Person Tent')

      await user.selectOptions(form.getByLabelText(/^location/i), 'Central DC · Building B · Aisle 1 · Rack A · Shelf 1')
      await submit(user, 'Save')

      expect(await within(screen.getByRole('row', { name: /Alpine 2-Person Tent/ })).findByText('Building B')).toBeInTheDocument()
      expect(api.calls('PATCH', '/item-locations/3')[0].body).toEqual({ itemId: 1 })
      expect(api.calls('PATCH', '/item-locations/1')[0].body).toEqual({ itemId: null })
      expect(api.calls('PATCH', '/items/1')).toHaveLength(0)
    })

    it('given None, takes the item out of its location', async () => {
      const { api, user } = await open()
      const form = await openDialog(user, 'Edit Alpine 2-Person Tent')

      await user.selectOptions(form.getByLabelText(/^location/i), 'None')
      await submit(user, 'Save')

      expect(await within(screen.getByRole('row', { name: /Alpine 2-Person Tent/ })).findByText(/no location/i)).toBeInTheDocument()
      expect(api.calls('PATCH', '/item-locations/1')[0].body).toEqual({ itemId: null })
    })
  })
})
