import "dotenv/config";
import app from "./app.js";

const port = Number(process.env.PORT ?? 8082);

app.listen(port, () => {
  console.log(`Mailing Express listening on http://localhost:${port}`);
});
