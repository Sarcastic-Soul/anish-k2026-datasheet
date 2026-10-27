// GET  /probes          -> { total, pins: { JAVA: 12, ... } }
// POST /probes {pin}    -> { pin, count, total }
// Counts how often visitors probe each pin on the pinout. One DynamoDB item
// per pin, plus a "_total" item, each with an atomic counter "n".
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, TransactWriteCommand, BatchGetCommand } from "@aws-sdk/lib-dynamodb";

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = process.env.TABLE;
const TOTAL = "_total";

// Same 40 names as js/data.js. Anything else is rejected, so the table stays small.
const PINS = new Set(("JAVA NIO SPRING PY FASTAPI TS BUN NODE RUST VCC K8S HELM DOCKER K6 PROM GRAFANA LOKI CICD LINUX GND " +
  "PGSQL PGVEC REDIS SQLITE CHROMA LANGGRAPH RAG TFLITE LLAMA GEMINI RESP TCP MCP REACT NEXT RN SOCKIO WEBRTC GTK4 INK").split(" "));

const reply = (statusCode, body) => ({
  statusCode,
  headers: { "content-type": "application/json", "cache-control": "no-store" },
  body: JSON.stringify(body)
});

const bump = pin => ({
  Update: {
    TableName: TABLE,
    Key: { pin },
    UpdateExpression: "ADD n :one",
    ExpressionAttributeValues: { ":one": 1 }
  }
});

export async function handler(event) {
  if (event.requestContext.http.method === "GET") {
    const { Items = [] } = await db.send(new ScanCommand({ TableName: TABLE }));
    const pins = {};
    let total = 0;
    for (const { pin, n } of Items) {
      if (pin === TOTAL) total = n;
      else pins[pin] = n;
    }
    return reply(200, { total, pins });
  }

  let pin;
  try {
    pin = JSON.parse(event.isBase64Encoded ? Buffer.from(event.body, "base64").toString() : event.body || "{}").pin;
  } catch {
    return reply(400, { error: "Body must be JSON." });
  }
  if (!PINS.has(pin)) return reply(400, { error: "Unknown pin." });

  await db.send(new TransactWriteCommand({ TransactItems: [bump(pin), bump(TOTAL)] }));
  const { Responses } = await db.send(new BatchGetCommand({
    RequestItems: { [TABLE]: { Keys: [{ pin }, { pin: TOTAL }] } }
  }));
  const got = Object.fromEntries(Responses[TABLE].map(i => [i.pin, i.n]));
  return reply(200, { pin, count: got[pin] ?? 1, total: got[TOTAL] ?? 1 });
}
