import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "vitest";

const definition = JSON.parse(
  readFileSync(
    resolve(__dirname, "../../../infra/aws/state-machine.asl.json"),
    "utf8",
  ),
);
const states = definition.States;

describe("crawl state machine dry-run flow", () => {
  it("normalizes a missing or non-true dryRun before the first crawl", () => {
    assert.equal(definition.StartAt, "CheckDryRun");
    assert.deepEqual(states.CheckDryRun.Choices, [
      { Variable: "$.dryRun", BooleanEquals: true, Next: "FirstCrawl" },
    ]);
    assert.equal(states.CheckDryRun.Default, "SetDryRunFalse");
    assert.equal(states.SetDryRunFalse.Result, false);
    assert.equal(states.SetDryRunFalse.ResultPath, "$.dryRun");
    assert.equal(states.SetDryRunFalse.Next, "FirstCrawl");
  });

  it("retains execution input through every crawler and reads the saved result", () => {
    for (const name of ["First", "Second", "Third"]) {
      const crawl = states[`${name}Crawl`];
      const result = states[`${name}Result`];
      assert.equal(crawl.Parameters["Payload.$"], "$");
      assert.equal(crawl.ResultPath, "$.crawlResult");
      assert.equal(crawl.Next, `${name}Result`);
      for (const choice of result.Choices) {
        assert.equal(choice.Variable, "$.crawlResult.Payload.status");
      }
    }
  });

  it("passes the preserved dryRun to the dispatcher", () => {
    assert.deepEqual(states.DispatchDueNotifications.Parameters.Payload, {
      "dryRun.$": "$.dryRun",
    });
  });

  it("keeps three crawl stages with two 20-minute waits for every source", () => {
    assert.deepEqual(
      Object.keys(states).filter(name => name.endsWith("Crawl") && states[name].Type === "Task"),
      ["FirstCrawl", "SecondCrawl", "ThirdCrawl"],
    );
    assert.equal(states.WaitBeforeSecondCrawl.Seconds, 1200);
    assert.equal(states.WaitBeforeThirdCrawl.Seconds, 1200);
    for (const choice of states.ThirdResult.Choices)
      assert.equal(choice.Next, "NoFreshData");
  });
});
