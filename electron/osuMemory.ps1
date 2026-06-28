# Node.js が UTF-8 で stdout を読むため、出力エンコードを UTF-8 に固定する
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding            = [System.Text.Encoding]::UTF8

# osu! 安定版のメモリから現在読み込んでいる譜面のフォルダ名と .osu ファイル名を取得する
# 参照: OsuMemoryDataProvider / ProcessMemoryDataFinder (Piotrekol)
#   AoB パターン: F8 01 74 04 83 65  (OsuBase)
#   pattern-0xC  -> static field address -> beatmap object
#   beatmap + 0x78 -> FolderName (.NET string)
#   beatmap + 0x90 -> OsuFileName (.NET string)

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Text;

public static class OsuMem {
    [DllImport("kernel32.dll")]
    static extern IntPtr OpenProcess(int access, bool inherit, int pid);

    [DllImport("kernel32.dll")]
    static extern bool CloseHandle(IntPtr h);

    [DllImport("kernel32.dll")]
    static extern bool ReadProcessMemory(IntPtr h, ulong addr, byte[] buf, int size, out int bytesRead);

    [DllImport("kernel32.dll")]
    static extern int VirtualQueryEx(IntPtr h, ulong addr, out MBI mbi, int size);

    [StructLayout(LayoutKind.Explicit, Size = 48)]
    struct MBI {
        [FieldOffset(0)]  public ulong Base;
        [FieldOffset(8)]  public ulong AllocBase;
        [FieldOffset(16)] public uint  AllocProt;
        [FieldOffset(24)] public ulong RegionSize;
        [FieldOffset(32)] public uint  State;
        [FieldOffset(36)] public uint  Prot;
        [FieldOffset(40)] public uint  Type;
    }

    static int ReadI32(IntPtr h, ulong addr) {
        byte[] buf = new byte[4]; int r;
        if (!ReadProcessMemory(h, addr, buf, 4, out r) || r != 4) return 0;
        return BitConverter.ToInt32(buf, 0);
    }

    static string ReadNetStr(IntPtr h, ulong ptr) {
        if (ptr < 0x10000u) return null;
        int len = ReadI32(h, ptr + 4);
        if (len <= 0 || len > 4096) return null;
        byte[] buf = new byte[len * 2]; int r;
        if (!ReadProcessMemory(h, ptr + 8, buf, buf.Length, out r) || r == 0) return null;
        return Encoding.Unicode.GetString(buf, 0, r);
    }

    static ulong cachedPatAddr = 0;

    public static string GetBeatmap(int pid) {
        IntPtr h = OpenProcess(0x410, false, pid);
        if (h == IntPtr.Zero) { cachedPatAddr = 0; return "ERR:OPEN"; }
        try {
            if (cachedPatAddr != 0) {
                int sf  = ReadI32(h, cachedPatAddr - 0xC);
                if (sf != 0) {
                    int bm  = ReadI32(h, (ulong)(uint)sf);
                    if (bm != 0) {
                        int fnp = ReadI32(h, (ulong)(uint)bm + 0x78);
                        int fop = ReadI32(h, (ulong)(uint)bm + 0x90);
                        string folder = ReadNetStr(h, (ulong)(uint)fnp);
                        string file   = ReadNetStr(h, (ulong)(uint)fop);
                        if (!string.IsNullOrEmpty(folder) && !string.IsNullOrEmpty(file) && file.EndsWith(".osu"))
                            return folder + "|" + file;
                    }
                }
                cachedPatAddr = 0;
            }

            byte[] pat = { 0xF8, 0x01, 0x74, 0x04, 0x83, 0x65 };
            int mbiSz  = Marshal.SizeOf(typeof(MBI));
            ulong addr = 0x10000u;

            while (addr < 0x7FFF0000u) {
                MBI mbi;
                if (VirtualQueryEx(h, addr, out mbi, mbiSz) == 0) break;
                ulong next = mbi.Base + mbi.RegionSize;
                bool isExec = (mbi.Prot & 0xF0u) != 0;
                if (mbi.State == 0x1000u && isExec && mbi.RegionSize > 0 && mbi.RegionSize <= 64u * 1024u * 1024u) {
                    byte[] buf = new byte[(int)mbi.RegionSize]; int rd;
                    if (ReadProcessMemory(h, mbi.Base, buf, (int)mbi.RegionSize, out rd) && rd >= pat.Length) {
                        for (int i = 0; i <= rd - pat.Length; i++) {
                            bool match = true;
                            for (int j = 0; j < pat.Length; j++) {
                                if (buf[i + j] != pat[j]) { match = false; break; }
                            }
                            if (!match) continue;
                            ulong patAddr = mbi.Base + (ulong)i;
                            if (patAddr < 0xCu) continue;
                            int sf  = ReadI32(h, patAddr - 0xC);
                            if (sf == 0) continue;
                            int bm  = ReadI32(h, (ulong)(uint)sf);
                            if (bm == 0) continue;
                            int fnp = ReadI32(h, (ulong)(uint)bm + 0x78);
                            int fop = ReadI32(h, (ulong)(uint)bm + 0x90);
                            string folder = ReadNetStr(h, (ulong)(uint)fnp);
                            string file   = ReadNetStr(h, (ulong)(uint)fop);
                            if (!string.IsNullOrEmpty(folder) && !string.IsNullOrEmpty(file) && file.EndsWith(".osu")) {
                                cachedPatAddr = patAddr;
                                return folder + "|" + file;
                            }
                        }
                    }
                }
                if (next <= addr) break;
                addr = next;
            }
            return "NOT_FOUND";
        } catch (Exception ex) {
            return "ERR:" + ex.Message.Replace('\n', ' ').Replace('\r', ' ');
        } finally {
            CloseHandle(h);
        }
    }
}
'@

$lastOutput = ""

while ($true) {
    try {
        $osuProc = Get-CimInstance Win32_Process -Filter "Name='osu!.exe'" -ErrorAction SilentlyContinue | Select-Object -First 1

        if (-not $osuProc) {
            if ($lastOutput -ne "NOT_RUNNING") {
                $lastOutput = "NOT_RUNNING"
                Write-Output "NOT_RUNNING"
                [Console]::Out.Flush()
            }
            Start-Sleep -Milliseconds 2000
            continue
        }

        $result = [OsuMem]::GetBeatmap([int]$osuProc.ProcessId)

        if ($result -match '^([^|]+)\|(.+\.osu)$') {
            $folder  = $Matches[1]
            $osuFile = $Matches[2]

            $exeDir  = Split-Path $osuProc.ExecutablePath
            $cfg     = Join-Path $exeDir "osu!.cfg"
            $songsDir = "Songs"
            if (Test-Path $cfg) {
                $line = (Get-Content $cfg -Encoding UTF8 -ErrorAction SilentlyContinue) | Where-Object { $_ -match '^BeatmapDirectory\s*=' } | Select-Object -First 1
                if ($line) { $songsDir = ($line -split '=', 2)[1].Trim() }
            }
            if (-not [IO.Path]::IsPathRooted($songsDir)) {
                $songsDir = Join-Path $exeDir $songsDir
            }

            $fullPath = Join-Path $songsDir (Join-Path $folder $osuFile)

            if ($fullPath -ne $lastOutput) {
                $lastOutput = $fullPath
                Write-Output $fullPath
                [Console]::Out.Flush()
            }
        } else {
            $wasShowingFile = $false
            if ($lastOutput -ne "" -and $lastOutput -ne "NOT_RUNNING" -and $lastOutput -ne "NOT_FOUND") {
                if (-not $lastOutput.StartsWith("ERR:")) {
                    $wasShowingFile = $true
                }
            }
            if ($wasShowingFile) {
                $lastOutput = "NOT_FOUND"
                Write-Output "NOT_FOUND"
                [Console]::Out.Flush()
            }
        }
    } catch { }

    Start-Sleep -Milliseconds 1000
}
