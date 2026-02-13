import { Page, Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Page Object for the File Upload page
 */
export class FileUploadPage extends BasePage {
  readonly fileInput: Locator;
  readonly uploadButton: Locator;
  readonly uploadedFileName: Locator;

  constructor(page: Page) {
    super(page);
    this.fileInput = page.locator("#file-upload");
    this.uploadButton = page.locator("#file-submit");
    this.uploadedFileName = page.locator("#uploaded-files");
  }

  async goto() {
    await super.goto("/upload");
  }

  async uploadFile(filePath: string) {
    await this.fileInput.setInputFiles(filePath);
    await this.uploadButton.click();
  }

  async getUploadedFileName(): Promise<string> {
    return await this.uploadedFileName.textContent() || "";
  }
}
