import { describe } from "../src/decorator-describe";
import { test } from "../src/decorator-test";
import { beforeEach, beforeAll, afterAll } from "../src/decorator-lifecycle";
import { step } from "../src/decorator-step";
import { tag } from "../src/decorator-tag";
import { expect } from "@playwright/test";
import { BaseTest } from "../src/baseTest";
import { FileUploadPage } from "./page-objects/FileUploadPage";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

@describe("File Upload - Upload Functionality")
class FileUploadTests extends BaseTest {
  fileUploadPage!: FileUploadPage;
  static testFilePath: string;
  static testFileName = "test-upload.txt";

  @beforeAll()
  static async createTestFile() {
    // Create a temporary test file
    FileUploadTests.testFilePath = path.join(__dirname, FileUploadTests.testFileName);
    fs.writeFileSync(FileUploadTests.testFilePath, "This is a test file for upload");
  }

  @afterAll()
  static async cleanupTestFile() {
    // Remove the temporary test file
    if (fs.existsSync(FileUploadTests.testFilePath)) {
      fs.unlinkSync(FileUploadTests.testFilePath);
    }
  }

  @beforeEach()
  async setup() {
    this.fileUploadPage = new FileUploadPage(this.page);
    await this.fileUploadPage.goto();
  }

  @tag("upload", "smoke")
  @test("should upload a text file successfully")
  async testUploadTextFile() {
    await this.uploadFile(FileUploadTests.testFilePath);

    const uploadedFileName = await this.fileUploadPage.getUploadedFileName();
    expect(uploadedFileName.trim()).toBe(FileUploadTests.testFileName);
  }

  @tag("upload")
  @test("should display uploaded file name")
  async testDisplayUploadedFileName() {
    await this.uploadFile(FileUploadTests.testFilePath);

    const uploadedFileName = await this.fileUploadPage.getUploadedFileName();
    expect(uploadedFileName.trim()).toBeTruthy();
    expect(uploadedFileName).toContain(".txt");
  }

  @step("Upload file from path $0")
  async uploadFile(filePath: string) {
    await this.fileUploadPage.uploadFile(filePath);
  }
}
