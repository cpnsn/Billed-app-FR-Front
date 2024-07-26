/**
 * @jest-environment jsdom
 */

import { screen, waitFor, within } from "@testing-library/dom"
import userEvent from '@testing-library/user-event'
import BillsUI from "../views/BillsUI.js"
import { bills } from "../fixtures/bills.js"
import { ROUTES, ROUTES_PATH } from "../constants/routes.js"
import {localStorageMock} from "../__mocks__/localStorage.js"
import mockStore from "../__mocks__/store"
import Bills from "../containers/Bills.js"

import router from "../app/Router.js";

const setLocalStorage = () => {
  Object.defineProperty(window, 'localStorage', { value: localStorageMock })
  window.localStorage.setItem('user', JSON.stringify({
    type: 'Employee'
  }))
}

beforeEach(() => {
  setLocalStorage()
  const root = document.createElement("div")
  root.setAttribute("id", "root")
  document.body.append(root)
  router()
})

describe("Given I am connected as an employee", () => {
  describe("When I am on Bills Page", () => {
    test("Then bill icon in vertical layout should be highlighted", async () => {
      window.onNavigate(ROUTES_PATH.Bills)
      await waitFor(() => screen.getByTestId('icon-window'))
      const windowIcon = screen.getByTestId('icon-window')
      //to-do write expect expression
      expect(windowIcon.classList.contains('active-icon')).toBe(true)
    })
    test("Then bills should be ordered from earliest to latest", () => {
      document.body.innerHTML = BillsUI({ data: bills })
      const dates = screen.getAllByText(/^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i).map(a => a.innerHTML)
      const antiChrono = (a, b) => ((a < b) ? 1 : -1)
      const datesSorted = [...dates].sort(antiChrono)
      expect(dates).toEqual(datesSorted)
    })
  });

  describe("When I am on Bills Page and I click on newBill button", () => {
    test("Then I should be redirected to the newBill form", async () => {
      window.onNavigate(ROUTES_PATH.Bills)
      await waitFor(() => screen.getByTestId('btn-new-bill'))
      const newBillBtn = screen.getByTestId("btn-new-bill")
      
      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname })
      }

      const billsDashboard = new Bills({
        document, onNavigate, store: null, bills: bills, localStorage: window.localStorage,
      });
      const handleClickNewBill = jest.fn(billsDashboard.handleClickNewBill)
      newBillBtn.addEventListener("click", handleClickNewBill)
      userEvent.click(newBillBtn)
      expect(handleClickNewBill).toHaveBeenCalled()
      expect(screen.getByText("Envoyer une note de frais")).toBeTruthy()
      expect(screen.getByTestId("form-new-bill")).toBeTruthy()
    })
  });

  describe("When I am on Bills Page and I click on the icon eye", () => {
    test("A modal should open", async () => {
      window.onNavigate(ROUTES_PATH.Bills)
      await waitFor(() => screen.getByTestId('tbody'))
      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname });
      };

      const billsDashboard = new Bills({
        document, onNavigate, store: null, localStorage: window.localStorage,
      });
      $.fn.modal = jest.fn();
      const iconEyes = screen.getAllByTestId("icon-eye");
      iconEyes.forEach(icon => {
        icon.addEventListener("click", (e) => billsDashboard.handleClickIconEye(icon));
      });

      userEvent.click(iconEyes[0]);
      await waitFor(() => screen.getByTestId("modaleFile"));
      expect(screen.getByTestId("modaleFile")).toBeTruthy();
      expect($.fn.modal).toHaveBeenCalled();
    });
  });

  describe("When I navigate to Bills Page", () => {
    test("fetches bills from mock API GET", async () => {
      jest.spyOn(mockStore, "bills");
      window.onNavigate(ROUTES_PATH.Bills);
      await waitFor(() => screen.getByText("Mes notes de frais"));

      const newBillBtn = screen.getByTestId("btn-new-bill");
      const billsTableRows = screen.getByTestId("tbody");

      expect(newBillBtn).toBeTruthy();
      expect(billsTableRows).toBeTruthy();
      expect(within(billsTableRows).getAllByRole("row")).toHaveLength(bills.length);
    });

    describe("When an error occurs on API", () => {
      beforeEach(() => {
        jest.spyOn(mockStore, "bills");
        Object.defineProperty(window, 'localStorage', { value: localStorageMock });
        localStorage.setItem('user', JSON.stringify({ 
          type: 'Employee', 
          email: 'a@a' 
        }));
        const root = document.createElement("div");
        root.setAttribute("id", "root");
        document.body.appendChild(root);
        router();
      });

      test("fetches bills from an API and fails with 404 message error", async () => {
        mockStore.bills.mockImplementationOnce(() => {
          return {
            list: () => Promise.reject(new Error("Erreur 404")),
          };
        });

        window.onNavigate(ROUTES_PATH.Bills);
        await new Promise(process.nextTick);
        const message = await screen.getByText(/Erreur 404/);
        expect(message).toBeTruthy();
      });

      test("fetches bills from an API and fails with 500 message error", async () => {
        mockStore.bills.mockImplementationOnce(() => {
          return {
            list: () => Promise.reject(new Error("Erreur 500")),
          };
        });

        window.onNavigate(ROUTES_PATH.Bills);
        await new Promise(process.nextTick);
        const message = await screen.getByText(/Erreur 500/);
        expect(message).toBeTruthy();
      });
    });
  })

  // test d'intégration GET
  describe("When I navigate to Bills Page and call getBills", () => {
    test("should fetch and format the bills correctly", async () => {
      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname })
      }

      const billsDashboard = new Bills({
        document, onNavigate, store: mockStore, localStorage: window.localStorage,
      })

      const spyGetBills = jest.spyOn(billsDashboard, "getBills")
      const billsData = await billsDashboard.getBills()
      expect(spyGetBills).toHaveBeenCalled()
      expect(billsData.length).toBeGreaterThan(0)
      expect(billsData[0]).toHaveProperty("date")
      expect(billsData[0]).toHaveProperty("status")
    })

    test("should handle corrupted data", async () => {
      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname })
      }

      const billsDashboard = new Bills({
        document, onNavigate, store: {
          bills: () => ({
            list: () => Promise.resolve([{
              id: '47qAXb6fIm2zOKkLzMro',
              vat: '80',
              amount: 400,
              name: 'encore',
              fileName: 'preview-facture-free-201801-pdf-1.jpg',
              date: '2004-04-04',
              status: 'pending'
            }, {
              id: 'UIUZtnPQvnbFnB0ozvJh',
              vat: '40',
              amount: 100,
              name: 'test1',
              fileName: '1592770761.jpeg',
              date: 'not a date',
              status: 'refused'
            }])
          })
        }, localStorage: window.localStorage,
      })

      const billsData = await billsDashboard.getBills()
      expect(billsData[1].date).toEqual('not a date')
    })
  })
})