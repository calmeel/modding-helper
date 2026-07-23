using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
#if LEGACY_WORKING_BEATMAP
using osu.Framework.Audio;
using osu.Framework.Audio.Track;
using osu.Framework.Graphics.Textures;
using osu.Game.Skinning;
#endif
using System.Threading;
using osu.Framework.Logging;
using osu.Game.Beatmaps;
using osu.Game.Beatmaps.Formats;
using osu.Game.IO;
using osu.Game.Rulesets;
using osu.Game.Rulesets.Mods;
using osu.Game.Rulesets.Taiko;

namespace ModdingHelper.SrCalculator;

internal static class Program
{
    private const int difficultyVersion = 20260706;
    private const string sourceCommit = "e643ee36788f31ac2c2d07a3e19cd6fb563f2258";
    private static readonly string[] allowedMods = ["EZ", "HT", "HR", "DT", "HD", "FL"];
    private static readonly string[] modDisplayOrder = ["EZ", "HT", "HR", "DT", "HD", "FL"];

    private static readonly JsonSerializerOptions jsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    public static async Task<int> Main()
    {
        Logger.Enabled = false;
        Console.OutputEncoding = Encoding.UTF8;
        LegacyDifficultyCalculatorBeatmapDecoder.Register();

        try
        {
            string inputJson = await Console.In.ReadToEndAsync();
            var request = JsonSerializer.Deserialize<CalculationRequest>(inputJson, jsonOptions)
                          ?? throw new InvalidDataException("The request body is empty.");

            if (request.Beatmaps.Count > 100)
                throw new InvalidDataException("A maximum of 100 difficulties can be calculated at once.");

            string[] selectedMods = normalizeMods(request.Mods);
            validateMods(selectedMods);
            var results = calculateBeatmaps(request.Beatmaps, selectedMods);
            writeResponse(new CalculationResponse
            {
                Calculator = new CalculatorInfo
                {
                    Name = "osu!lazer",
                    Ruleset = "taiko",
                    DifficultyVersion = difficultyVersion,
                    SourceCommit = sourceCommit,
                    Mods = formatMods(selectedMods),
                },
                Results = results,
            });
            return 0;
        }
        catch (Exception ex)
        {
            writeResponse(new CalculationResponse { Error = ex.Message });
            return 1;
        }
    }

    private static BeatmapResult[] calculateBeatmaps(
        IReadOnlyList<BeatmapInput> beatmaps,
        IReadOnlyList<string> selectedMods)
    {
        var results = new BeatmapResult[beatmaps.Count];
        var options = new ParallelOptions
        {
            MaxDegreeOfParallelism = Math.Min(Environment.ProcessorCount, 4),
        };

        Parallel.For(0, beatmaps.Count, options, index =>
        {
            results[index] = calculate(beatmaps[index], selectedMods);
        });

        return results;
    }

    private static string[] normalizeMods(IEnumerable<string>? mods) =>
        (mods ?? [])
        .Select(mod => mod.Trim().ToUpperInvariant())
        .Where(mod => mod.Length > 0)
        .Distinct()
        .OrderBy(mod => Array.IndexOf(modDisplayOrder, mod))
        .ToArray();

    private static void validateMods(IReadOnlyCollection<string> mods)
    {
        if (mods.Any(mod => !allowedMods.Contains(mod)))
            throw new InvalidDataException("The selected mod combination contains an unsupported mod.");

        if (mods.Contains("EZ") && mods.Contains("HR"))
            throw new InvalidDataException("EZ and HR cannot be selected together.");

        if (mods.Contains("HT") && mods.Contains("DT"))
            throw new InvalidDataException("HT and DT/NC cannot be selected together.");
    }

    private static string formatMods(IReadOnlyCollection<string> mods) =>
        mods.Count == 0
            ? "NM"
            : string.Join(" + ", mods.Select(mod => mod == "DT" ? "DT/NC" : mod));

    private static BeatmapResult calculate(BeatmapInput input, IReadOnlyList<string> modAcronyms)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(input.Content))
                throw new InvalidDataException("The beatmap content is empty.");

            using var stream = new MemoryStream(Encoding.UTF8.GetBytes(input.Content));
            using var reader = new LineBufferedReader(stream);
            var beatmap = osu.Game.Beatmaps.Formats.Decoder
                .GetDecoder<Beatmap>(reader).Decode(reader);

#if OLD_CALCULATION_API
            if (beatmap.BeatmapInfo.RulesetID != 1)
#else
            if (beatmap.BeatmapInfo.Ruleset.OnlineID != 1)
#endif
                throw new InvalidDataException("Only native osu!taiko beatmaps are supported.");

            var ruleset = new TaikoRuleset();
            beatmap.BeatmapInfo.Ruleset = ruleset.RulesetInfo;
            string difficultyName = string.IsNullOrWhiteSpace(input.DifficultyName)
                ? beatmap.BeatmapInfo.DifficultyName
                : input.DifficultyName;
#if LEGACY_WORKING_BEATMAP
            var workingBeatmap = new LegacyFlatWorkingBeatmap(beatmap);
#else
            bool forceConvert = difficultyName.Contains("(taiko convert)", StringComparison.OrdinalIgnoreCase);
            var workingBeatmap = new ConvertMarkedWorkingBeatmap(beatmap, forceConvert);
#endif
            var calculator = ruleset.CreateDifficultyCalculator(workingBeatmap);
            var mods = modAcronyms
                .Select(acronym => ruleset.CreateModFromAcronym(acronym)
                    ?? throw new InvalidDataException($"Unsupported osu!taiko mod: {acronym}"))
                .ToArray();
#if OLD_CALCULATION_API
            var playableBeatmap = workingBeatmap.GetPlayableBeatmap(ruleset.RulesetInfo, mods);
            double starRating = calculator
                .CalculateTimed(playableBeatmap, CancellationToken.None, mods).Last().Attributes.StarRating;
#else
            double starRating = calculator.Calculate(mods).StarRating;
#endif

            return new BeatmapResult
            {
                FileName = input.FileName,
                DifficultyName = difficultyName,
                StarRating = starRating,
            };
        }
        catch (Exception ex)
        {
            return new BeatmapResult
            {
                FileName = input.FileName,
                DifficultyName = input.DifficultyName,
                Error = ex.Message,
            };
        }
    }

    private static void writeResponse(CalculationResponse response) =>
        Console.Out.Write(JsonSerializer.Serialize(response, jsonOptions));

    private sealed class CalculationRequest
    {
        public CalculationRequest() {}

        public List<string> Mods { get; init; } = [];
        public List<BeatmapInput> Beatmaps { get; init; } = [];
    }

    private sealed class BeatmapInput
    {
        public BeatmapInput() {}

        public string FileName { get; init; } = string.Empty;
        public string DifficultyName { get; init; } = string.Empty;
        public string Content { get; init; } = string.Empty;
    }

    private sealed class CalculationResponse
    {
        public CalculatorInfo? Calculator { get; init; }
        public IReadOnlyList<BeatmapResult>? Results { get; init; }
        public string? Error { get; init; }
    }

    private sealed class CalculatorInfo
    {
        public string Name { get; init; } = string.Empty;
        public string Ruleset { get; init; } = string.Empty;
        public int DifficultyVersion { get; init; }
        public string SourceCommit { get; init; } = string.Empty;
        public string Mods { get; init; } = string.Empty;
    }

#if !LEGACY_WORKING_BEATMAP
    private sealed class ConvertMarkedWorkingBeatmap : FlatWorkingBeatmap
    {
        private static readonly RulesetInfo osuRulesetInfo = new RulesetInfo
        {
            OnlineID = 0,
            ShortName = "osu",
            Name = "osu!",
        };
        private readonly bool forceConvert;

        public ConvertMarkedWorkingBeatmap(IBeatmap beatmap, bool forceConvert)
            : base(beatmap)
        {
            this.forceConvert = forceConvert;
        }

        public override IBeatmap GetPlayableBeatmap(
            IRulesetInfo ruleset,
            IReadOnlyList<Mod> mods,
            CancellationToken cancellationToken)
        {
            IBeatmap playableBeatmap = base.GetPlayableBeatmap(ruleset, mods, cancellationToken);
            if (forceConvert)
                playableBeatmap.BeatmapInfo.Ruleset = osuRulesetInfo;

            return playableBeatmap;
        }
    }
#else
    private sealed class LegacyFlatWorkingBeatmap : WorkingBeatmap
    {
        private readonly IBeatmap beatmap;

        public LegacyFlatWorkingBeatmap(IBeatmap beatmap)
            : base(beatmap.BeatmapInfo, null!)
        {
            this.beatmap = beatmap;
        }

        protected override IBeatmap GetBeatmap() => beatmap;
        protected override Texture? GetBackground() => null;
        protected override Track? GetBeatmapTrack() => null;
        protected override ISkin? GetSkin() => null;
        public override Stream? GetStream(string storagePath) => null;
    }
#endif

    private sealed class BeatmapResult
    {
        public string FileName { get; init; } = string.Empty;
        public string DifficultyName { get; init; } = string.Empty;
        public double? StarRating { get; init; }
        public string? Error { get; init; }
    }
}
