import test, { expect, type Page } from "@playwright/test";
import { e2eEnv } from "../support/e2e-env";

async function signInAsTeacher(page: Page) {
  await page.goto("/login");
  await page
    .getByRole("textbox", { name: /email|correo/i })
    .fill(e2eEnv.teacherEmail);
  await page
    .getByRole("textbox", { name: /password|contraseña/i })
    .fill(e2eEnv.teacherPassword);
  await page.getByRole("button", { name: /login|iniciar sesión/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test.describe("Students list", () => {
  test("teacher can inspect the list and its accessible action menu", async ({
    page,
  }) => {
    await signInAsTeacher(page);
    await page.getByRole("link", { name: /students|estudiantes/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/students/);

    const tableBody = page.getByTestId("student-table-body");
    await expect(tableBody).toHaveAttribute("aria-busy", "false");

    const studentRows = page.getByTestId("student-row");
    await expect(studentRows).not.toHaveCount(0);

    const firstRow = studentRows.first();
    const menuTrigger = firstRow.getByRole("button", {
      name: /más acciones|more actions/i,
    });
    await menuTrigger.click();

    const menu = page.getByRole("menu");
    await expect(menu).toBeVisible();
    await expect(
      menu.getByRole("menuitem", { name: "View Vouchers" }),
    ).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    await expect(menuTrigger).toBeFocused();
  });

  test("mobile cards expose real voucher balances and viewport-safe controls", async ({
    page,
  }) => {
    await signInAsTeacher(page);
    await page.route(/\/api\/students(?:\?.*)?$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [
            {
              id: "student-active",
              _id: "student-active",
              teacherId: "teacher",
              fullName: "Alba Activa",
              contactEmail: "alba@example.com",
              level: "B1",
              status: "active",
              isActive: true,
              activePlans: [
                {
                  id: "plan-active",
                  name: "Bono de conversación",
                  status: "active",
                  creditsRemaining: 2,
                  creditsTotal: 3,
                },
              ],
              createdAt: null,
              updatedAt: null,
            },
            {
              id: "student-exhausted",
              _id: "student-exhausted",
              teacherId: "teacher",
              fullName: "Eva Agotada",
              contactEmail: "eva@example.com",
              level: "A2",
              status: "active",
              isActive: true,
              activePlans: [
                {
                  id: "plan-exhausted",
                  name: "Bono agotado",
                  status: "exhausted",
                  creditsRemaining: 0,
                  creditsTotal: 3,
                },
              ],
              createdAt: null,
              updatedAt: null,
            },
            {
              id: "student-without-plan",
              _id: "student-without-plan",
              teacherId: "teacher",
              fullName: "Nora Sin Bono",
              contactEmail: "nora@example.com",
              level: "Evaluando",
              status: "inactive",
              isActive: false,
              activePlans: [],
              createdAt: null,
              updatedAt: null,
            },
            {
              id: "student-invalid-plan",
              _id: "student-invalid-plan",
              teacherId: "teacher",
              fullName: "Iris Saldo Inválido",
              contactEmail: "iris@example.com",
              level: "C1",
              status: "active",
              isActive: true,
              activePlans: [
                {
                  id: "plan-invalid",
                  name: "Bono sin total",
                  status: "active",
                  creditsRemaining: 0,
                  creditsTotal: 0,
                },
              ],
              createdAt: null,
              updatedAt: null,
            },
          ],
          pagination: {
            page: 1,
            limit: 10,
            total: 4,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
          },
          summary: {
            activeStudents: 3,
            expiringPlansSoon: 0,
            pendingLevel: 1,
            studentsWithoutActivePlan: 1,
          },
          page: 1,
          limit: 10,
          total: 4,
        }),
      });
    });

    await page.getByRole("link", { name: /students|estudiantes/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/students/);
    await expect(page.getByTestId("student-table-body")).toHaveAttribute(
      "aria-busy",
      "false",
    );

    for (const width of [320, 375, 390, 430]) {
      await page.setViewportSize({ width, height: 800 });

      const activeStudent = page.getByTestId("student-row").filter({
        hasText: "Alba Activa",
      });
      await expect(
        activeStudent.getByText("2/3 créditos", { exact: true }),
      ).toBeVisible();
      await expect(
        activeStudent.getByLabel(
          "2 créditos restantes de un bono de 3 créditos",
        ),
      ).toBeVisible();

      const exhaustedStudent = page.getByTestId("student-row").filter({
        hasText: "Eva Agotada",
      });
      await expect(
        exhaustedStudent.getByText("0/3 créditos", { exact: true }),
      ).toBeVisible();

      const studentWithoutPlan = page.getByTestId("student-row").filter({
        hasText: "Nora Sin Bono",
      });
      await expect(
        studentWithoutPlan.getByText("Sin bono", { exact: true }),
      ).toBeVisible();

      const studentWithInvalidBalance = page.getByTestId("student-row").filter({
        hasText: "Iris Saldo Inválido",
      });
      await expect(
        studentWithInvalidBalance.getByText("Saldo no disponible", {
          exact: true,
        }),
      ).toBeVisible();

      const menuTrigger = activeStudent.getByRole("button", {
        name: "Más acciones para Alba Activa",
      });
      await menuTrigger.click();
      const menu = page.getByRole("menu", { name: "Acciones para Alba Activa" });
      await expect(menu).toBeVisible();

      if (width === 320) {
        await expect(menu.getByRole("menuitem")).toHaveText([
          "Profile details",
          "View Vouchers",
          "New Lesson",
          "Edit Student",
          "Send email",
        ]);
        await expect(
          menu.getByRole("menuitem", { name: "Profile details" }),
        ).toHaveAttribute("href", /\/dashboard\/students\/student-active$/);
        await expect(
          menu.getByRole("menuitem", { name: "View Vouchers" }),
        ).toHaveAttribute(
          "href",
          /\/dashboard\/students\/student-active\/vouchersHistory$/,
        );
      }

      const menuBox = await menu.boundingBox();
      const triggerBox = await menuTrigger.boundingBox();
      expect(menuBox).not.toBeNull();
      expect(triggerBox).not.toBeNull();
      expect(menuBox!.x).toBeGreaterThanOrEqual(0);
      expect(menuBox!.x + menuBox!.width).toBeLessThanOrEqual(width);
      expect(triggerBox!.width).toBeGreaterThanOrEqual(40);
      expect(triggerBox!.height).toBeGreaterThanOrEqual(40);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);

      await page.keyboard.press("Escape");
      await expect(menu).toBeHidden();
    }

    const filterTrigger = page.getByRole("button", {
      name: "Filtros",
      exact: true,
    });
    const filterPanel = page.locator("#student-mobile-filters");
    await expect(filterTrigger).toHaveAttribute("aria-expanded", "false");
    await expect(filterPanel).toBeHidden();

    await filterTrigger.click();
    await expect(filterTrigger).toHaveAttribute("aria-expanded", "true");
    await expect(filterPanel).toBeVisible();

    await filterTrigger.click();
    await expect(filterTrigger).toHaveAttribute("aria-expanded", "false");
    await expect(filterPanel).toBeHidden();
  });
});
