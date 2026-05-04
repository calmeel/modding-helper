async function loadOszZip(file) {
  return JSZip.loadAsync(file, {
    decodeFileName: bytes => {
      try {
        return new TextDecoder("shift_jis").decode(bytes);
      } catch {
        return new TextDecoder().decode(bytes);
      }
    }
  });
}