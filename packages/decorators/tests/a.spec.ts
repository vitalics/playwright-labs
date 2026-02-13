import { test as baseTest } from "@playwright/test";

import { annotate, test } from "../src";
import { skip } from "../src/decorator-skip";
import { tag } from "../src/decorator-tag";
import { makeDecorators } from "../src/makeDecorators";
import { Annotation, annotation } from "../src/decorator-step";

type Fixture = {
  someinfo: string;
};

const newTest = baseTest.extend<Fixture>({
  someinfo: "someInfo",
});

baseTest(
  "qweasd",
  {
    annotation: { type: "asdqwe" },
  },
  () => {},
);

const { describe, BaseTest } = makeDecorators(newTest);

// baseTest("example test", async ({ page, browser }) => {
//   baseTest.info().annotations.push({
//     type: "browser version",
//     description: browser.version(),
//   });
// });

@describe("qweasd")
@tag("qweasd")
class A extends BaseTest {
  @annotate.field()
  testAnnotation = "asdqweasd";

  @test("Some")
  @tag(`qweasd`)
  @annotate((self) => BaseTest.toAnnotation(self.testAnnotation, self))
  asdqwe() {
    const { page } = this.pwSelf;
    console.log("page url:", "QWEASD");
    // Verify the annotation field is accessible at runtime
    this.testSelf.info().annotations.push({
      type: "runtime-annotation",
      description: this.testAnnotation + "runtime",
    });
  }
}
