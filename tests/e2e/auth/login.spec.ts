import test, { expect } from "@playwright/test";
import { e2eEnv } from "../support/e2e-env";

test.describe("Authentication", () => {
    test("shows the login page", async ({ page }) => {
        await page.goto("/login");
        await expect(page.getByRole("textbox", {
            name: /email|correo/i
        }),
        ).toBeVisible();
        await expect(page.getByRole("button", {
            name: /Login/i
        }),
        ).toBeVisible();

        await expect(page.getByLabel(/password|contraseña/i),).toBeVisible();
    });

    test("Teacher can log in with valid credentiasl", async ({
        page,
    }) => {
        await page.goto("login");
        await page.getByRole("textbox", { name: /email|correo/i, }).fill(e2eEnv.teacherEmail);
        await page.getByRole("textbox", { name: /password|contraseña/i }).fill(e2eEnv.teacherPassword);

        await page.getByRole("button", { name: /iniciar sesión|Login|sing in/i }).click()
        
        await expect(page).toHaveURL(/\/dashboard/,);
    });

    test("rejects invalid teacher credentials", async ({ page, }) => {
        await page.goto("/login")

        await page.getByRole("textbox", { name: /email|correo/i }).fill(e2eEnv.teacherEmail)
        await page.getByRole("textbox", { name: /password|contraseña/i }).fill(`${e2eEnv.teacherPassword}_invalid`)
        await page.getByRole("button", { name: /login|iniciar sesion/i }).click()

        const errorMessage = page.getByText("Invalid Credentials");
        await expect(errorMessage).toBeVisible();
    })
});