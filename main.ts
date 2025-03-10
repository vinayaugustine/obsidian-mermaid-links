import { Plugin, MarkdownPostProcessorContext, MarkdownView, PluginSettingTab, Setting, App } from 'obsidian';
import * as pako from 'pako';

interface MermaidLinksSettings {
    editLinkText: string;
    fullscreenLinkText: string;
}

const DEFAULT_SETTINGS: MermaidLinksSettings = {
    editLinkText: 'Edit',
    fullscreenLinkText: 'Full Screen'
};

export default class MermaidLinksPlugin extends Plugin {
    settings: MermaidLinksSettings;

    async onload() {
        console.log('Loading MermaidLinks plugin');
        
        await this.loadSettings();
        
        this.addSettingTab(new MermaidLinksSettingTab(this.app, this));
        
        this.registerMarkdownPostProcessor(this.processMermaidDiagrams.bind(this));
    }

    onunload() {
        console.log('Unloading MermaidLinks plugin');
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    processMermaidDiagrams(el: HTMLElement, ctx: MarkdownPostProcessorContext) {
        // Find all pre > code.language-mermaid elements
        const mermaidBlocks = el.querySelectorAll('pre > code.language-mermaid');
        mermaidBlocks.forEach(mermaidBlock => {
            const preElement = mermaidBlock.parentElement;
            if (!preElement) return;
            
            // Get the Mermaid diagram content
            const mermaidContent = mermaidBlock.textContent;
            if (!mermaidContent) return;

			console.log("VJA2 processing mermaid diagram", mermaidContent);
            // Generate PAKO compressed content
            const compressed = this.compressMermaid(mermaidContent);
            
            // Create links container
            const linksContainer = document.createElement('div');
            linksContainer.className = 'mermaid-links';
            linksContainer.style.textAlign = 'right';
            linksContainer.style.marginTop = '5px';
            
            // Create edit link
            const editLink = document.createElement('a');
            editLink.href = `https://mermaid.live/edit#pako:${compressed}`;
            editLink.textContent = this.settings.editLinkText;
            editLink.target = '_blank';
            editLink.className = 'mermaid-edit-link';
            editLink.style.marginRight = '10px';
            
            // Create full screen link
            const fullScreenLink = document.createElement('a');
            fullScreenLink.href = `https://mermaid.live/view#pako:${compressed}`;
            fullScreenLink.textContent = this.settings.fullscreenLinkText;
            fullScreenLink.target = '_blank';
            fullScreenLink.className = 'mermaid-fullscreen-link';
            
            // Add links to container
            linksContainer.appendChild(editLink);
            linksContainer.appendChild(fullScreenLink);
            
            // Insert links after the pre element
            preElement.parentNode?.insertBefore(linksContainer, preElement.nextSibling);
        });
    }

    compressMermaid(mermaidCode: string): string {
        // Compress the Mermaid code using PAKO
		const graph = {
			"code": mermaidCode,
			"mermaid": {"theme": "default"}
		}
        const textEncoder = new TextEncoder();
        const uint8Array = textEncoder.encode(JSON.stringify(graph));
        const compressedData = pako.deflate(uint8Array);
        
        // Convert to base64
        return btoa(
            Array.from(compressedData)
                .map(byte => String.fromCharCode(byte))
                .join('')
        )
            .replace(/\+/g, '-')
            .replace(/\//g, '_');
    }
}

class MermaidLinksSettingTab extends PluginSettingTab {
    plugin: MermaidLinksPlugin;

    constructor(app: App, plugin: MermaidLinksPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'Mermaid Links Settings' });

        new Setting(containerEl)
            .setName('Edit Link Text')
            .setDesc('The text to display for the edit link')
            .addText(text => text
                .setValue(this.plugin.settings.editLinkText)
                .onChange(async (value) => {
                    this.plugin.settings.editLinkText = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Full Screen Link Text')
            .setDesc('The text to display for the full screen link')
            .addText(text => text
                .setValue(this.plugin.settings.fullscreenLinkText)
                .onChange(async (value) => {
                    this.plugin.settings.fullscreenLinkText = value;
                    await this.plugin.saveSettings();
                }));
    }
}