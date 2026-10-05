import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const run = vi.hoisted(() => vi.fn(async (_days: number) => ({ sent: 2 })));
vi.mock("@/services/payment.service", () => ({ PaymentService: { runDailyAutoReminders: run } }));

import { GET } from "../route";

const req = (auth?: string) =>
  new Request("http://localhost/api/payments/cron/reminders", { headers: auth ? { authorization: auth } : {} });

describe("cron reminders route", () => {
  const orig = process.env.CRON_SECRET;
  beforeEach(() => {
    run.mockClear();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    if (orig === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = orig;
  });

  it("500 when CRON_SECRET unset", async () => {
    delete process.env.CRON_SECRET;
    expect((await GET(req("Bearer x"))).status).toBe(500);
    expect(run).not.toHaveBeenCalled();
  });
  it("401 on wrong or missing bearer", async () => {
    process.env.CRON_SECRET = "s3cret";
    expect((await GET(req("Bearer wrong"))).status).toBe(401);
    expect((await GET(req())).status).toBe(401);
    expect(run).not.toHaveBeenCalled();
  });
  it("200 on correct bearer", async () => {
    process.env.CRON_SECRET = "s3cret";
    const res = await GET(req("Bearer s3cret"));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ sent: 2 });
    expect(run).toHaveBeenCalledWith(14);
  });
});
