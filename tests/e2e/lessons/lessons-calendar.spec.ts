import test, { expect, type Page, type Route } from "@playwright/test";

import { e2eEnv } from "../support/e2e-env";

const baseLesson = {
  courseName: null,
  courseLink: null,
  timezone: "Europe/Madrid",
  classType: "private",
  isTrial: false,
  attendeesCount: 1,
  blocksCount: 2,
  resourcesCount: 0,
  totalEstimatedMinutes: 60,
  totalActualMinutes: 0,
  scheduledDurationMinutes: 60,
};

const lessons = [
  {
    ...baseLesson,
    id: "lesson-known",
    title: "Conversación con Claire",
    status: "scheduled",
    preparationStatus: "prepared",
    scheduledStart: "2026-08-11T09:00:00+02:00",
    scheduledEnd: "2026-08-11T10:00:00+02:00",
  },
  {
    ...baseLesson,
    id: "lesson-overlap",
    title: "Gramática con Mansor",
    status: "in_progress",
    preparationStatus: "needs_preparation",
    scheduledStart: "2026-08-11T09:30:00+02:00",
    scheduledEnd: "2026-08-11T10:30:00+02:00",
  },
  {
    ...baseLesson,
    id: "lesson-short",
    title: "Repaso breve",
    status: "completed",
    preparationStatus: "prepared",
    scheduledStart: "2026-08-12T11:00:00+02:00",
    scheduledEnd: "2026-08-12T11:30:00+02:00",
    scheduledDurationMinutes: 30,
  },
  {
    ...baseLesson,
    id: "lesson-late",
    title: "Clase nocturna",
    status: "canceled_by_teacher",
    preparationStatus: "prepared",
    scheduledStart: "2026-08-16T21:30:00+02:00",
    scheduledEnd: "2026-08-16T23:00:00+02:00",
    scheduledDurationMinutes: 90,
  },
  ...Array.from({ length: 4 }, (_, index) => ({
    ...baseLesson,
    id: `lesson-month-${index}`,
    title: `Lección extra ${index + 1}`,
    status: "scheduled",
    preparationStatus: "prepared",
    scheduledStart: `2026-08-11T${String(12 + index).padStart(2, "0")}:00:00+02:00`,
    scheduledEnd: `2026-08-11T${String(13 + index).padStart(2, "0")}:00:00+02:00`,
  })),
];

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

async function fulfillLessons(route: Route) {
  const url = new URL(route.request().url());
  const start = url.searchParams.get("start");
  const end = url.searchParams.get("end");

  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      ok: true,
      view: url.searchParams.get("view") ?? "week",
      range: { start, end },
      items: lessons,
    }),
  });
}

test.describe("Lessons calendar", () => {
  test.use({ timezoneId: "Europe/Madrid" });

  test("defaults to Week and keeps URL-backed Day, Month and List views", async ({
    page,
  }) => {
    await page.clock.setFixedTime(new Date("2026-08-25T10:00:00+02:00"));
    await signInAsTeacher(page);
    await page.route(/\/api\/lessons(?:\?.*)?$/, fulfillLessons);

    await page.goto("/es/dashboard/lessons");
    await expect(page).toHaveURL(
      /\/es\/dashboard\/lessons\?view=week&date=2026-08-25$/,
    );
    await expect(page.getByRole("tab", { name: "Semana" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(page.getByTestId("lessons-calendar")).toHaveAttribute(
      "data-calendar-view",
      "week",
    );

    await page.getByRole("tab", { name: "Día" }).click();
    await expect(page).toHaveURL(/view=day&date=2026-08-25/);
    await expect(page.getByTestId("lessons-calendar")).toHaveAttribute(
      "data-calendar-view",
      "day",
    );

    await page.getByRole("tab", { name: "Mes" }).click();
    await expect(page).toHaveURL(/view=month&date=2026-08-25/);
    await expect(page.getByTestId("lessons-calendar")).toHaveAttribute(
      "data-calendar-view",
      "month",
    );

    await page.getByRole("tab", { name: "Lista" }).click();
    await expect(page).toHaveURL(/view=list&date=2026-08-25/);
    await expect(page.getByTestId("lessons-list-view")).toBeVisible();

    await page.getByRole("tab", { name: "Semana" }).click();
    await expect(page).toHaveURL(/view=week&date=2026-08-25/);
    await page.getByRole("button", { name: "Semana siguiente" }).click();
    await expect(page).toHaveURL(/view=week&date=2026-09-01/);
    await page.getByRole("button", { name: "Semana anterior" }).click();
    await expect(page).toHaveURL(/view=week&date=2026-08-25/);

    await page.goto("/es/dashboard/lessons?view=week&date=2026-08-10");
    await page.getByRole("button", { name: "Hoy", exact: true }).click();
    await expect(page).toHaveURL(/view=week&date=2026-08-25/);
  });

  test("places known lessons in a real responsive time grid", async ({ page }) => {
    await signInAsTeacher(page);
    const requestedRanges: Array<{ start: string | null; end: string | null }> = [];
    await page.route(/\/api\/lessons(?:\?.*)?$/, async (route) => {
      const url = new URL(route.request().url());
      requestedRanges.push({
        start: url.searchParams.get("start"),
        end: url.searchParams.get("end"),
      });
      await fulfillLessons(route);
    });

    await page.goto("/es/dashboard/lessons?view=week&date=2026-08-10");
    const calendar = page.getByTestId("lessons-calendar");
    await expect(calendar).toHaveAttribute("aria-busy", "false");
    await expect(
      page.getByRole("link", { name: /Ver lección Conversación con Claire/i }),
    ).toBeVisible();
    await expect(
      calendar.locator(".lessons-calendar-slot-header").filter({ hasText: "09:00" }),
    ).toBeVisible();
    await expect(calendar.locator(".lessons-calendar-day-header")).toHaveCount(7);
    expect(requestedRanges.at(-1)?.start).toBeTruthy();
    expect(requestedRanges.at(-1)?.end).toBeTruthy();

    const hourEvent = page.getByRole("link", {
      name: /Ver lección Conversación con Claire/i,
    });
    const overlappingEvent = page.getByRole("link", {
      name: /Ver lección Gramática con Mansor/i,
    });
    const shortEvent = page.getByRole("link", {
      name: /Ver lección Repaso breve/i,
    });
    const hourBox = await hourEvent.boundingBox();
    const overlapBox = await overlappingEvent.boundingBox();
    const shortBox = await shortEvent.boundingBox();
    expect(hourBox).not.toBeNull();
    expect(overlapBox).not.toBeNull();
    expect(shortBox).not.toBeNull();
    expect(hourBox!.height).toBeGreaterThan(shortBox!.height * 1.5);
    expect(hourBox!.x).not.toBe(overlapBox!.x);

    for (const width of [320, 375, 390, 430, 768, 1024, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(calendar).toBeVisible();
      const scrollState = await calendar.evaluate((element) => {
        const candidates = [element, ...Array.from(element.querySelectorAll("*"))];
        const hasInternalHorizontalScroll = candidates.some((candidate) => {
          const node = candidate as HTMLElement;
          const overflowX = window.getComputedStyle(node).overflowX;
          return (
            node.scrollWidth > node.clientWidth + 1 &&
            (overflowX === "auto" || overflowX === "scroll")
          );
        });
        const hasInternalVerticalScroll = candidates.some((candidate) => {
          const node = candidate as HTMLElement;
          const overflowY = window.getComputedStyle(node).overflowY;
          return (
            node.scrollHeight > node.clientHeight + 1 &&
            (overflowY === "auto" || overflowY === "scroll")
          );
        });

        return {
          viewportWidth: window.innerWidth,
          hasInternalHorizontalScroll,
          hasInternalVerticalScroll,
          hasGlobalOverflow:
            document.documentElement.scrollWidth > window.innerWidth + 1,
          overflowingElements: candidates
            .filter((candidate) => {
              const rect = (candidate as HTMLElement).getBoundingClientRect();
              return rect.right > window.innerWidth + 1 || rect.left < -1;
            })
            .slice(0, 8)
            .map((candidate) => {
              const node = candidate as HTMLElement;
              const rect = node.getBoundingClientRect();
              return {
                tag: node.tagName,
                className: node.className,
                left: rect.left,
                right: rect.right,
                scrollWidth: node.scrollWidth,
                clientWidth: node.clientWidth,
              };
            }),
        };
      });
      expect(
        scrollState.hasGlobalOverflow,
        JSON.stringify(scrollState, null, 2),
      ).toBe(false);
      expect(scrollState.hasInternalVerticalScroll).toBe(true);
      if (width <= 768) expect(scrollState.hasInternalHorizontalScroll).toBe(true);

      if (width === 320) {
        const horizontalScroller = calendar.locator(
          ".lessons-calendar-horizontal-scroll",
        );
        await horizontalScroller.evaluate((element) => {
          element.scrollLeft = 360;
        });
        await expect
          .poll(() => horizontalScroller.evaluate((element) => element.scrollLeft))
          .toBeGreaterThan(0);

        await horizontalScroller.evaluate((element) => {
          element.scrollLeft = 0;
        });
      }
    }

    await page.setViewportSize({ width: 320, height: 900 });
    await page.getByRole("tab", { name: "Mes" }).click();
    await expect(calendar).toHaveAttribute("data-calendar-view", "month");
    await expect(calendar.locator(".lessons-calendar-day-header")).toHaveCount(7);
    await expect(calendar.getByText(/\+\d+ más/).first()).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 1,
      ),
    ).toBe(false);

    await calendar.getByText(/\+\d+ más/).first().click();
    await expect(page).toHaveURL(/view=day&date=2026-08-11/);
    await expect(calendar).toHaveAttribute("data-calendar-view", "day");
    await expect(calendar.locator(".lessons-calendar-day-header")).toHaveCount(1);
  });
});
