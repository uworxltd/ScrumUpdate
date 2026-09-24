// Note: don't include original file in index.html, instead obfuscate it with obfuscator.io (Low,Mangled)
const key = 'env';

function load(input) {
  const mod = input.length % 4;

  window[key] = 'loader';

  if (mod === 2) input += "==";
  else if (mod === 3) input += "=";
  else if (mod === 1) throw new Error("Invalid input");

  let decoded = typeof atob === "function"
    ? atob(input)
    : Buffer.from(input, "base64").toString("utf8");

  decoded = decoded.replace(/\/\/\s.*\n/g, "").replace(/\n/g, "").replace(/\s/g, "");

  eval(decoded);
}

load(loader);