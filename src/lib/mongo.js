export async function mongoRequest(c, action, body) {
  const url = `https://data.mongodb-api.com/app/
		${c.env.MONGO_APP_ID}/endpoint/data/v1/action/${action}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": c.env.MONGO_API_KEY,
    },
    body: JSON.stringify({
      dataSource: c.env.MONGO_CLUSTER,
      ...body,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }

  return res.json();
}
