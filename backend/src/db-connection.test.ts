import { afterEach, describe, expect, it } from "vitest";
import { getDatabaseConnection } from "./_core/dbConnection";

afterEach(() => { delete process.env.DATABASE_SSL; });

describe("DATABASE_URL parsing", () => {
  it("turns SSL on automatically for TiDB Cloud", () => {
    const c = getDatabaseConnection("mysql://2abc.root:p%40ss@gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/haricart");
    expect(c).toMatchObject({ host: "gateway01.ap-southeast-1.prod.aws.tidbcloud.com", port: 4000, user: "2abc.root", password: "p@ss", database: "haricart" });
    expect(c.ssl).toMatchObject({ minVersion: "TLSv1.2", rejectUnauthorized: true });
  });

  it("leaves SSL off for a local MySQL unless asked", () => {
    expect(getDatabaseConnection("mysql://root:pw@localhost:3306/haricart").ssl).toBeUndefined();
    process.env.DATABASE_SSL = "true";
    expect(getDatabaseConnection("mysql://root:pw@localhost:3306/haricart").ssl).toBeDefined();
  });

  it("still accepts the ssl={...} query style", () => {
    const c = getDatabaseConnection('mysql://u:p@db.example.com/haricart?ssl={"rejectUnauthorized":true}');
    expect(c.ssl).toMatchObject({ rejectUnauthorized: true });
    expect(c.database).toBe("haricart");
  });
});
