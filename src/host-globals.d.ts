// Minimal globals used by the plugin host, not the isolated user-script realm.
// Java and ToolPkg bridges are declared locally in their consuming modules.
declare const console: {
 log(...args: unknown[]): void;
 info(...args: unknown[]): void;
 warn(...args: unknown[]): void;
 error(...args: unknown[]): void;
};
