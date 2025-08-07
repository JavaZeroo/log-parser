import { keywordExtractorPlugin } from './extractors/keywordExtractor.js';
import { regexExtractorPlugin } from './extractors/regexExtractor.js';

/**
 * A registry of all available data extractor plugins.
 * The application will use this registry to discover and use the plugins.
 * The key is the plugin's unique `name`, and the value is the plugin object itself.
 */
export const extractorPlugins = {
  [keywordExtractorPlugin.name]: keywordExtractorPlugin,
  [regexExtractorPlugin.name]: regexExtractorPlugin,
};

/**
 * An ordered list of plugin names, defining the order they appear in the UI.
 */
export const extractorPluginOrder = [
  keywordExtractorPlugin.name,
  regexExtractorPlugin.name,
];
