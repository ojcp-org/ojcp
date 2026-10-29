#!/usr/bin/env node
// Searches every job source in the OJCP registry and prints one merged JSON result.
//
//   node ojcp-search.mjs "data analyst" --city Chicago --state IL --remote --limit 5
//   node ojcp-search.mjs --detail <source-domain> <ojcp_id>
//   node ojcp-search.mjs --sources
//
// Node 18+, no dependencies. Reads only public endpoints and sends no candidate data: the
// search query and location filters are the only things that leave the machine.

const REGISTRY = "https://ojcp.dev/api/registry";
const TIMEOUT_MS = 15_000;
// Entries a registry marks as reference or test implementations serve sample data, not jobs.
const NOT_REAL_JOBS = new Set(["reference", "test", "sandbox"]);

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const value = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

async function fetchJson(url, init = {}) {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res;
}

/** Job sources from the registry that can be searched without a key and serve real jobs. */
async function sources() {
  const index = await (await fetchJson(REGISTRY)).json();
  return (index.providers ?? index)
    .filter((p) => p.mcp_endpoint && !p.auth_required)
    .filter((p) => !(p.industries ?? []).some((i) => NOT_REAL_JOBS.has(i)))
    .map((p) => ({
      domain: p.domain,
      name: p.name,
      // Registries can list a plain-http endpoint that only redirects; ask for https directly.
      endpoint: p.mcp_endpoint.replace(/^http:\/\//, "https://"),
      agentApply: Boolean(p.has_agent_apply),
    }));
}

/** One MCP JSON-RPC exchange; handles plain JSON and SSE replies and carries the session id. */
async function rpc(source, session, method, params) {
  const headers = { "content-type": "application/json", accept: "application/json, text/event-stream" };
  if (session.id) headers["mcp-session-id"] = session.id;
  const res = await fetchJson(source.endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({ jsonrpc: "2.0", id: ++session.seq, method, ...(params ? { params } : {}) }),
  });
  session.id = res.headers.get("mcp-session-id") ?? session.id;
  const text = await res.text();
  const data = text.split("\n").filter((l) => l.startsWith("data:")).map((l) => l.slice(5)).pop() ?? text;
  const msg = JSON.parse(data);
  if (msg.error) throw new Error(msg.error.message ?? "tool error");
  return msg.result;
}

async function callTool(source, name, args) {
  const session = { seq: 0 };
  await rpc(source, session, "initialize", {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "ojcp-job-search-skill", version: "1" },
  });
  const result = await rpc(source, session, "tools/call", { name, arguments: args });
  if (result.isError) throw new Error(result.content?.[0]?.text ?? "tool error");
  return result.structuredContent ?? JSON.parse(result.content[0].text);
}

const money = (s) => {
  if (!s) return undefined;
  const v = s.value ?? s;
  const lo = v.minValue ?? s.minValue, hi = v.maxValue ?? s.maxValue;
  const unit = (v.unitText ?? s.unitText ?? "").toLowerCase();
  const range = [lo, hi].filter((n) => n != null).join("-");
  return range ? `${s.currency ?? "USD"} ${range}${unit ? `/${unit}` : ""}` : undefined;
};

const place = (loc) => {
  const one = Array.isArray(loc) ? loc[0] : loc;
  const a = one?.address ?? {};
  return [a.addressLocality, a.addressRegion, a.addressCountry].filter(Boolean).join(", ") || undefined;
};

/** The fields a candidate decides on, plus how to apply. */
function summarize(job, source) {
  const paths = job.apply_paths ?? [];
  return {
    source: source.domain,
    ojcp_id: job.ojcp_id,
    title: job.title,
    employer: job.employer?.name,
    location: place(job.jobLocation),
    remote_policy: job.remote_policy,
    pay: money(job.baseSalary),
    posted: job.datePosted,
    apply_url: paths.find((p) => p.url)?.url ?? job.url,
    agent_can_apply: source.agentApply && paths.some((p) => p.supports_agent_submission),
  };
}

async function search(query) {
  const location = {
    ...(value("city") && { city: value("city") }),
    ...(value("state") && { state: value("state") }),
    ...(value("country") && { country: value("country") }),
    ...(flag("remote") && { remote_ok: true }),
  };
  const limit = Number(value("limit") ?? 5);
  const list = await sources();
  const hasLocation = Object.keys(location).length > 0;
  const settled = await Promise.allSettled(
    list.map(async (s) => {
      const run = async (withLocation) => {
        const r = await callTool(s, "search_jobs", {
          query,
          ...(withLocation && { location }),
          pagination: { limit },
        });
        return (r.jobs ?? []).map((j) => ({ ...summarize(j, s), ...(!withLocation && hasLocation && { location_filter_ignored: true }) }));
      };
      try {
        return await run(hasLocation);
      } catch (e) {
        // Some sources refuse filters they can't apply; their results are still worth showing,
        // marked so the agent checks the location itself.
        if (!hasLocation) throw e;
        return run(false);
      }
    })
  );
  return {
    query,
    location,
    sources: list.map((s, i) => ({
      domain: s.domain,
      ok: settled[i].status === "fulfilled",
      ...(settled[i].status === "rejected" && { error: String(settled[i].reason?.message ?? settled[i].reason) }),
    })),
    jobs: settled.flatMap((r) => (r.status === "fulfilled" ? r.value : [])),
  };
}

async function main() {
  if (flag("sources")) return sources();
  if (flag("detail")) {
    const [domain, id] = args.slice(args.indexOf("--detail") + 1);
    const source = (await sources()).find((s) => s.domain === domain);
    if (!source) throw new Error(`unknown source ${domain}; run with --sources`);
    return callTool(source, "get_job_detail", { job_id: id });
  }
  const query = args.find((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));
  if (!query) throw new Error('usage: ojcp-search.mjs "<what you are looking for>" [--city X] [--state X] [--remote] [--limit N]');
  return search(query);
}

main()
  .then((out) => process.stdout.write(`${JSON.stringify(out, null, 2)}\n`))
  .catch((e) => {
    process.stderr.write(`${e.message}\n`);
    process.exit(1);
  });
