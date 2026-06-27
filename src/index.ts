import { Hono } from "hono";
import api from "./api";
import { DashboardPage, StatsPage } from "./pages";
import redirect from "./redirect";
import type { AppEnv } from "./types";

const app = new Hono<AppEnv>();

app.get("/health", (c) => c.json({ status: "ok" }));

app.route("/api", api);

app.get("/", (c) => c.html(DashboardPage()));

app.get("/stats/:id", (c) => c.html(StatsPage()));

app.route("/", redirect);

export default app;
