# Node.js が UTF-8 で stdout を読むため、出力エンコードを UTF-8 に固定する
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding            = [System.Text.Encoding]::UTF8

# osu! 安定版のメモリから現在読み込んでいる譜面のパスと再生位置を取得する
# 参照: OsuMemoryDataProvider / ProcessMemoryDataFinder (Piotrekol)
#   OsuBase パターン: F8 01 74 04 83 65
#   PlayTime パターン: B8 ?? ?? ?? ?? 8D 74 26 00

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Text;

public static class OsuMem {
    [DllImport("kernel32.dll")] static extern IntPtr OpenProcess(int access, bool inherit, int pid);
    [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr h);
    [DllImport("kernel32.dll")] static extern bool ReadProcessMemory(IntPtr h, ulong addr, byte[] buf, int size, out int bytesRead);
    [DllImport("kernel32.dll")] static extern int VirtualQueryEx(IntPtr h, ulong addr, out MBI mbi, int size);

    // システムタイマー分解能を上げる(1ms)。これを呼ばないと Start-Sleep が
    // 既定の約15.6ms 刻みに丸められ、16ms 指定でも実効 ~31ms(約33Hz)になる。
    [DllImport("winmm.dll")] public static extern uint timeBeginPeriod(uint uPeriod);
    [DllImport("winmm.dll")] public static extern uint timeEndPeriod(uint uPeriod);

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

    // int[] パターン: -1 = ワイルドカード（任意バイトにマッチ）
    static ulong ScanWildcard(IntPtr h, int[] pat) {
        int mbiSz = Marshal.SizeOf(typeof(MBI));
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
                            if (pat[j] >= 0 && buf[i + j] != (byte)pat[j]) { match = false; break; }
                        }
                        if (match) return mbi.Base + (ulong)i;
                    }
                }
            }
            if (next <= addr) break;
            addr = next;
        }
        return 0;
    }

    static ulong cachedPatAddr     = 0;
    static ulong cachedPlayTimePtr = 0;

    // 戻り値: "folder|file.osu" / "NOT_FOUND" / "ERR:..."
    // ★ 元のコードのスキャンロジックをそのまま復元（ポインタ検証付きループ）
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

    // PlayTime: パターン 5E 5F 5D C3 A1 ?? ?? ?? ?? 89 ?? 04
    //   A1 (index 4) は mov eax,[moffs32]。直後 (found+5) の 4 バイトが
    //   再生位置を保持する静的アドレス。これを 1 回間接参照して ms を読む。
    //   (gosumemory / tosu / OsuMemoryDataProvider と同じ仕組み)
    // 戻り値: 再生位置 ms / -1 = 取得不可
    public static int GetPlayTime(int pid) {
        IntPtr h = OpenProcess(0x410, false, pid);
        if (h == IntPtr.Zero) { cachedPlayTimePtr = 0; return -1; }
        try {
            if (cachedPlayTimePtr == 0) {
                int[] pat = { 0x5E, 0x5F, 0x5D, 0xC3, 0xA1, -1, -1, -1, -1, 0x89, -1, 0x04 };
                ulong found = ScanWildcard(h, pat);
                if (found == 0) return -1;
                cachedPlayTimePtr = found + 5;
            }
            int staticAddr = ReadI32(h, cachedPlayTimePtr);
            if (staticAddr == 0) { cachedPlayTimePtr = 0; return -1; }
            int t = ReadI32(h, (ulong)(uint)staticAddr);
            return t;
        } catch {
            cachedPlayTimePtr = 0;
            return -1;
        } finally {
            CloseHandle(h);
        }
    }
}
'@

# ── ポーリング間隔 ──
#   再生位置(GetPlayTime)は軽量なので高頻度(約60Hz)で読む。
#   譜面パス(GetBeatmap)はキャッシュミス時にメモリ全スキャンが走り得る上、
#   譜面切替時しか変化しないので低頻度(250ms)に分離する。
$POLL_MS     = 16
$BEATMAP_MS  = 100

$lastBeatmapPath    = ""
$lastStatus         = ""
$osuProcInfo        = $null
$lastProcCheckTime  = [DateTime]::MinValue
$lastBeatmapCheck   = [DateTime]::MinValue

# Start-Sleep が指定どおりの分解能で効くようタイマーを 1ms に上げる
[OsuMem]::timeBeginPeriod(1) | Out-Null

while ($true) {
    try {
        # osu! 未接続のときだけ CIM(重い WMI 列挙) で探索する。
        # 接続中は CIM を回さない（毎回走るとループがブロックされ、再生時刻が周期的に止まるため）。
        # 終了検知は下の GetBeatmap の "ERR:OPEN"(OpenProcess 失敗)で行う。
        if ($null -eq $osuProcInfo) {
            if (([DateTime]::Now - $lastProcCheckTime).TotalSeconds -ge 2) {
                $p = Get-CimInstance Win32_Process -Filter "Name='osu!.exe'" -ErrorAction SilentlyContinue | Select-Object -First 1
                if ($p) {
                    $exeDir = Split-Path $p.ExecutablePath
                    $cfg    = Join-Path $exeDir "osu!.cfg"
                    $sDir   = "Songs"
                    if (Test-Path $cfg) {
                        $line = (Get-Content $cfg -Encoding UTF8 -ErrorAction SilentlyContinue) |
                                Where-Object { $_ -match '^BeatmapDirectory\s*=' } | Select-Object -First 1
                        if ($line) { $sDir = ($line -split '=', 2)[1].Trim() }
                    }
                    if (-not [IO.Path]::IsPathRooted($sDir)) { $sDir = Join-Path $exeDir $sDir }
                    $osuProcInfo = @{ Pid = [int]$p.ProcessId; SongsDir = $sDir }
                    $lastBeatmapCheck = [DateTime]::MinValue  # 接続直後はすぐ譜面取得
                }
                $lastProcCheckTime = [DateTime]::Now
            }
        }

        if (-not $osuProcInfo) {
            if ($lastStatus -ne "NOT_RUNNING") {
                $lastStatus      = "NOT_RUNNING"
                $lastBeatmapPath = ""
                Write-Output "NOT_RUNNING"
                [Console]::Out.Flush()
            }
            Start-Sleep -Milliseconds 100
            continue
        }

        $osuPid   = $osuProcInfo.Pid
        $songsDir = $osuProcInfo.SongsDir

        # 譜面パス（250ms ごと・変化した場合のみ出力）
        if (([DateTime]::Now - $lastBeatmapCheck).TotalMilliseconds -ge $BEATMAP_MS) {
            $bmResult = [OsuMem]::GetBeatmap($osuPid)
            if ($bmResult -eq 'ERR:OPEN') {
                # osu! が終了した（OpenProcess 失敗）→ 切断して再探索へ
                $osuProcInfo = $null
                $lastProcCheckTime = [DateTime]::MinValue
                if ($lastStatus -ne 'NOT_RUNNING') {
                    $lastStatus      = 'NOT_RUNNING'
                    $lastBeatmapPath = ''
                    Write-Output 'NOT_RUNNING'
                    [Console]::Out.Flush()
                }
                Start-Sleep -Milliseconds 100
                continue
            }
            if ($bmResult -match '^([^|]+)\|(.+\.osu)$') {
                $fullPath = Join-Path $songsDir (Join-Path $Matches[1] $Matches[2])
                if ($fullPath -ne $lastBeatmapPath) {
                    $lastBeatmapPath = $fullPath
                    $lastStatus      = "PATH"
                    Write-Output $fullPath
                    [Console]::Out.Flush()
                }
            } else {
                if ($lastBeatmapPath -ne "") {
                    $lastBeatmapPath = ""
                    $lastStatus      = "NOT_FOUND"
                    Write-Output "NOT_FOUND"
                    [Console]::Out.Flush()
                }
            }
            $lastBeatmapCheck = [DateTime]::Now
        }

        # 再生位置（毎回出力: -1 = 取得不可）
        $t = [OsuMem]::GetPlayTime($osuPid)
        Write-Output "TIME:$t"
        [Console]::Out.Flush()

    } catch { }

    Start-Sleep -Milliseconds $POLL_MS
}
