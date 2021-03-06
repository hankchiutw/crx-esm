import { toPromise } from '../utils';

export class ScriptLoader {
  public injectOnCommands: string[] = [];
  public injectOnClicked = true;
  public contentScript = 'content.js';

  private injectedTabMap = {};

  constructor() {
    this.handleTabUpdated();
    this.handleContentInjection();
  }

  public async isInjected(): Promise<boolean> {
    const tabId = await this.getActiveTabId();
    return !!this.injectedTabMap[tabId];
  }

  /**
   * Inject the {@link contentScript} into the {@link tabId}.
   */
  private async inject(tabId: number): Promise<void> {
    if (this.injectedTabMap[tabId]) {
      return;
    }

    if (!this.contentScript || typeof this.contentScript !== 'string') {
      throw new Error(`Not a valid content script: ${this.contentScript}`);
    }

    return toPromise<void>(chrome.tabs.executeScript)(tabId, {
      file: this.contentScript,
    }).then(() => {
      this.injectedTabMap[tabId] = true;
    });
  }

  /**
   * Inject content script according to {@link injectOnClicked} and {@link injectOnCommands}.
   */
  private handleContentInjection() {
    chrome.browserAction &&
      chrome.browserAction.onClicked.addListener(({ id }) => {
        this.injectOnClicked && this.inject(id);
      });

    chrome.commands &&
      chrome.commands.onCommand.addListener(async (command: string) => {
        if (!Array.isArray(this.injectOnCommands)) {
          return;
        }
        if (this.injectOnCommands.includes(command)) {
          const tabId = await this.getActiveTabId();
          this.inject(tabId);
        }
      });
  }

  private async getActiveTabId(): Promise<number> {
    const tabs = await toPromise<chrome.tabs.Tab[]>(chrome.tabs.query)({
      active: true,
      currentWindow: true,
    });
    return tabs[0].id;
  }

  /**
   * Keep `injectedTabMap` reliable when tab updated.
   */
  private handleTabUpdated() {
    chrome.tabs.onUpdated.addListener(tabId => {
      delete this.injectedTabMap[tabId];
    });
  }
}
