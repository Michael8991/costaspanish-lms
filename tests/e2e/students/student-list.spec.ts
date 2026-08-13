import test, { expect } from "@playwright/test";
import { e2eEnv } from "../support/e2e-env";

test.describe("Dynamic waits in service-based applications",()=> {
    test("teacher can inspect the student list", async ({ page }) => {
        await page.goto("/login")
        const emailInput = page.getByRole("textbox", { name: /email|correo/i, })
        const passwordInput = page.getByRole("textbox", { name: /password|contraseña/i })
        const loginButton = page.getByRole("button", { name: /login|iniciar sesión/i })
        
        await emailInput.fill(e2eEnv.teacherEmail)
        await passwordInput.fill(e2eEnv.teacherPassword)
        await loginButton.click();
        
        await expect(page).toHaveURL(/\/dashboard/,);
        
        await page.getByRole('link', { name: /students|estudiantes/i }).click();
        await expect(page).toHaveURL(/\/dashboard\/students/,);

        const tableBody = page.getByTestId("student-table-body")
        await expect(tableBody).toHaveAttribute("aria-busy", "false")
        
        const studentRows = page.getByTestId("student-row")
        
        await expect(studentRows).not.toHaveCount(0)
        
        const menuButtons = page.locator(".menu-button")

        await menuButtons.first().click()

        const menuDropDown = page.locator(".menu-dropdown")

        await expect(menuDropDown).toBeVisible()

        const viewVoucherBtn = page.locator("a").filter({hasText:"View Vouchers"})
        await expect(viewVoucherBtn).toBeVisible()
    })
})