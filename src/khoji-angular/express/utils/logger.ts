import winston from 'winston';
import config from './config';

const { combine, timestamp, printf, colorize, errors } = winston.format;

const LOG_LEVEL = config.logLevel;

const defaultFormat = printf((info: any) => {
  // pull `label` out of the info so it's not included in the JSON meta
  const { timestamp, level, message, stack, label, ...meta } = info;
  const labelStr = label ? `[${label}] ` : '';
  const metaKeys = Object.keys(meta || {});
  const metaStr = metaKeys.length ? ` ${JSON.stringify(meta)}` : '';
  return `${timestamp} ${level}: ${labelStr}${stack || message}${metaStr}`;
});

const logger = winston.createLogger({
  level: LOG_LEVEL,
  format: combine(
    errors({ stack: true }),
    timestamp(),
    defaultFormat
  ),
  transports: [
    new winston.transports.Console({
      format: combine(colorize(), timestamp(), defaultFormat)
    })
  ]
});

export default logger;

// helper to create a child logger with `module` or `label` meta
export function getLogger(label?: string) {
  if (!label) return logger;
  // winston supports `child` which attaches defaultMeta
  // Type is `Logger` but child() may not be present in some typings, cast to any safely
  // so callers can do: const log = getLogger('my-module'); log.info('...')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (logger as any).child ? (logger as any).child({ label }) : logger;
}
