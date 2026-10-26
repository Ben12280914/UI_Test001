/** Reset data and seed the September baseline report (synthetic). `npm run seed` */
import { seedDemoData } from "../src/server/workflow/demoSeed";

seedDemoData()
  .then((r) => console.log("Seeded September baseline report:", r.septemberReportId))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
