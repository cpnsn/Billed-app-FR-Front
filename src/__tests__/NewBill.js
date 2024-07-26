/**
 * @jest-environment jsdom
 */

import { screen, waitFor, fireEvent } from "@testing-library/dom"
import userEvent from '@testing-library/user-event'
import { ROUTES, ROUTES_PATH } from "../constants/routes.js"
import { localStorageMock } from "../__mocks__/localStorage.js"
import mockStore from "../__mocks__/store"
import NewBillUI from "../views/NewBillUI.js"
import NewBill from "../containers/NewBill.js"
import router from "../app/Router.js"

const setNewBill = () => {
  return new NewBill({
    document,
    onNavigate: (pathname) => document.body.innerHTML = ROUTES({ pathname }),
    store: mockStore,
    localStorage: window.localStorage,
  })
}

beforeEach(() => {
  Object.defineProperty(window, "localStorage", { value: localStorageMock })
  window.localStorage.setItem("user", JSON.stringify({
    type: "Employee",
  }))
  const root = document.createElement("div")
  root.setAttribute("id", "root")
  document.body.append(root)
  router()
})

describe("Given I am connected as an employee", () => {
  describe("When I am on NewBill Page", () => {
    test("Then mail icon in vertical layout should be highlighted", async () => {
      window.onNavigate(ROUTES_PATH.NewBill)
      await waitFor(() => screen.getByTestId('icon-mail'))
      const mailIcon = screen.getByTestId('icon-mail')
      expect(mailIcon.classList.contains('active-icon')).toBe(true)
    })

    test("Then the form should be rendered correctly", () => {
      document.body.innerHTML = NewBillUI()
      expect(screen.getByTestId('form-new-bill')).toBeTruthy()
    })
  })

  describe("When I upload a file", () => {
    test("Then the file should be validated", async () => {
      document.body.innerHTML = NewBillUI()
      const newBill = setNewBill()
      const handleChangeFile = jest.fn(newBill.handleChangeFile)
      const fileInput = screen.getByTestId('file')

      fileInput.addEventListener('change', handleChangeFile)

      const file = new File(['sample'], 'sample.png', { type: 'image/png' })
      userEvent.upload(fileInput, file)

      expect(handleChangeFile).toHaveBeenCalled()
      expect(fileInput.files[0]).toStrictEqual(file)
      expect(fileInput.files).toHaveLength(1)
    })

    test("Then an error message should be displayed for invalid file type", async () => {
      document.body.innerHTML = NewBillUI()
      const newBill = setNewBill()
      const fileInput = screen.getByTestId('file')

      const file = new File(['sample'], 'sample.pdf', { type: 'application/pdf' })
      userEvent.upload(fileInput, file)

      await waitFor(() => screen.getByText('Veuillez sélectionner une image au format jpg, jpeg ou png'))
      const errorMessage = screen.getByText('Veuillez sélectionner une image au format jpg, jpeg ou png')
      expect(errorMessage).toBeTruthy()
      expect(fileInput.value).toBe('')
    })
  })

  describe("When I submit the form", () => {
    test("Then the form should be submitted successfully", async () => {
      document.body.innerHTML = NewBillUI()
      const newBill = setNewBill()

      const handleSubmit = jest.fn(newBill.handleSubmit)
      const form = screen.getByTestId('form-new-bill')

      form.addEventListener('submit', handleSubmit)

      fireEvent.submit(form)

      expect(handleSubmit).toHaveBeenCalled()
      expect(screen.getByText('Mes notes de frais')).toBeTruthy()
    })
  })

  describe("When an error occurs on API", () => {
    beforeEach(() => {
      jest.spyOn(mockStore, "bills")
      Object.defineProperty(
        window,
        'localStorage',
        { value: localStorageMock }
      )
      window.localStorage.setItem('user', JSON.stringify({
        type: 'Employee',
        email: "a@a"
      }))
      const root = document.createElement("div")
      root.setAttribute("id", "root")
      document.body.appendChild(root)
      router()
    })

    test("fetches bills from an API and fails with 404 message error", async () => {
      mockStore.bills.mockImplementationOnce(() => {
        return {
          list: () => {
            return Promise.reject(new Error("Erreur 404"))
          }
        }
      })
      window.onNavigate(ROUTES_PATH.NewBill)
      await new Promise(process.nextTick)
      const message = await screen.getByText(/Erreur 404/)
      expect(message).toBeTruthy()
    })

    test("fetches bills from an API and fails with 500 message error", async () => {
      mockStore.bills.mockImplementationOnce(() => {
        return {
          list: () => {
            return Promise.reject(new Error("Erreur 500"))
          }
        }
      })
      window.onNavigate(ROUTES_PATH.NewBill)
      await new Promise(process.nextTick)
      const message = await screen.getByText(/Erreur 500/)
      expect(message).toBeTruthy()
    })
  })
})