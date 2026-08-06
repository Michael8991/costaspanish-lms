import test from "@playwright/test"

test.describe("Teacher authentication", () => {
    test("allows interaction with the login form", async ({ page }) => {
        await page.goto("/login");

        const emailInput = page.getByLabel(/Correo electrónico|Email address/i);

        const passwordInput = page.getByLabel(/Constraseña|Password/i);

        const submitButton = page.getByRole("button", { name: /Iniciar sesión|Login|Sign in/i });

        await emailInput.fill("teacher.e2e@example.com");
        await passwordInput.fill("invalid-password");
        await submitButton.click();
        
    })
})