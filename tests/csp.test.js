import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const nginxConfPath = path.resolve(__dirname, '../nginx.conf');
const indexHtmlPath = path.resolve(__dirname, '../index.html');

describe('Content Security Policy (CSP)', () => {
  it('primary flow: nginx.conf should have a valid CSP header', () => {
    const nginxContent = fs.readFileSync(nginxConfPath, 'utf8');
    const cspRegex = /add_header Content-Security-Policy "(.*)" always;/;
    const match = nginxContent.match(cspRegex);
    expect(match).not.toBeNull();
    const csp = match[1];

    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("connect-src");
  });

  it('primary flow: index.html should have a valid CSP meta tag', () => {
    const htmlContent = fs.readFileSync(indexHtmlPath, 'utf8');
    const htmlCspRegex = /<meta http-equiv="Content-Security-Policy" content="(.*)" \/>/;
    const htmlMatch = htmlContent.match(htmlCspRegex);
    expect(htmlMatch).not.toBeNull();
    const htmlCsp = htmlMatch[1];

    expect(htmlCsp).toContain("default-src 'self'");
    expect(htmlCsp).toContain("script-src 'self'");
    expect(htmlCsp).toContain("connect-src");
  });

  it('boundary case: allows required endpoints without overly permissive wildcards', () => {
    const nginxContent = fs.readFileSync(nginxConfPath, 'utf8');
    const match = nginxContent.match(/add_header Content-Security-Policy "(.*)" always;/);
    expect(match).not.toBeNull();
    const csp = match[1];

    expect(csp).toContain("https://*.stellar.org");
    expect(csp).toContain("wss://*.walletconnect.com");
    expect(csp).not.toMatch(/connect-src [^;]*\s\*(?:\s|;)/);
  });

  it('failure case: blocks arbitrary malicious endpoints and unencrypted http', () => {
    const nginxContent = fs.readFileSync(nginxConfPath, 'utf8');
    const match = nginxContent.match(/add_header Content-Security-Policy "(.*)" always;/);
    expect(match).not.toBeNull();
    const csp = match[1];

    expect(csp).not.toContain("evil.com");
    expect(csp).not.toContain("http://");
  });
});
