import { ValueExtractor } from '../utils/ValueExtractor';

// Helper to extract step number from a line
const extractStep = (line, stepCfg) => {
    if (!stepCfg.enabled) return null;
    const idx = line.toLowerCase().indexOf(stepCfg.keyword.toLowerCase());
    if (idx !== -1) {
        const after = line.substring(idx + stepCfg.keyword.length);
        const match = after.match(/[+-]?\d+/);
        if (match) {
            const s = parseInt(match[0], 10);
            if (!isNaN(s)) return s;
        }
    }
    return null;
};

self.onmessage = (e) => {
    const { type, payload } = e.data;

    if (type === 'PARSE_FILE') {
        const { fileId, content, config } = payload;
        const metricsData = {};

        try {
            // Split lines only once and reuse for all metrics
            const lines = content.split('\n');

            const stepCfg = {
                enabled: config.useStepKeyword,
                keyword: config.stepKeyword || 'step:'
            };

            config.metrics.forEach((metric, idx) => {
                let points = [];
                let rawMatches = [];

                // Use ValueExtractor with pre-split lines array to avoid repeated split()
                if (metric.mode === 'keyword') {
                    rawMatches = ValueExtractor.extractByKeyword(lines, metric.keyword);
                } else if (metric.regex) {
                    rawMatches = ValueExtractor.extractByRegex(lines, metric.regex);
                }

                // Map matches to {x, y} points, extracting steps if needed
                // Note: ValueExtractor returns { value, line, text }
                // We need to re-process to get steps efficiently, or modify ValueExtractor to return steps?
                // ValueExtractor processes line by line.
                // If we use ValueExtractor, we iterate lines there.
                // But we also need the step from the SAME line.
                // ValueExtractor returns the line text and line number.

                // Optimization: If we need steps, we might need to look at the line again.
                // ValueExtractor returns 'text' which is the line content.

                points = rawMatches.map((match, i) => {
                    const step = extractStep(match.text, stepCfg);
                    return {
                        x: step !== null ? step : i, // Fallback to index if no step found, but this index is match index, not line index.
                        // Wait, original logic used `results.length` as fallback x.
                        // If we map, `i` is the index in the matches array.
                        y: match.value
                    };
                });

                // Determine key name
                let key = '';
                if (metric.name && metric.name.trim()) {
                    key = metric.name.trim();
                } else if (metric.keyword) {
                    key = metric.keyword.replace(/[:：]/g, '').trim();
                } else if (metric.regex) {
                    const sanitized = metric.regex.replace(/[^a-zA-Z0-9_]/g, '').trim();
                    key = sanitized || `metric${idx + 1}`;
                } else {
                    key = `metric${idx + 1}`;
                }

                metricsData[key] = points;
            });

            self.postMessage({
                type: 'PARSE_COMPLETE',
                payload: {
                    fileId,
                    metricsData
                }
            });

        } catch (error) {
            self.postMessage({
                type: 'PARSE_ERROR',
                payload: {
                    fileId,
                    error: error.message
                }
            });
        }
    }
};
