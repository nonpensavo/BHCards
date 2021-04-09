var bh;
!(function (bh) {
    class Cacheable {
        constructor() {
            this._cache = {};
        }
        clearCache(...keys) {
            keys.length ? keys.forEach((key) => delete this._cache[key]) : (this._cache = {});
        }
        fromCache(key, fn) {
            return key in this._cache || (this._cache[key] = fn()), this._cache[key];
        }
        static clearCache() {
            this._cache = {};
        }
        static fromCache(key, fn) {
            return key in this._cache || (this._cache[key] = fn()), this._cache[key];
        }
    }
    (Cacheable._cache = {}), (bh.Cacheable = Cacheable);
})(bh || (bh = {})),
    (function (bh) {
        function formatRow(imageGroup, imageName, name, badgeValue, id = "") {
            return (
                "number" == typeof badgeValue && (badgeValue = bh.utils.formatNumber(badgeValue)),
                `<div data-hud="true" id="${id}">${bh.getImg20(imageGroup, imageName)} <span class="name">${name}</span><span class="badge pull-right">${badgeValue}</span></div>`
            );
        }
        function formatSummaryRow(data) {
            return (
                '<div data-hud="true" style="text-align:center;"><span class="badge" style="border:1px solid #777;background-color:#fff;color:#555;">' +
                data.map((values) => `${values[0] && values[1] ? bh.getImg12(values[0], values[1]) : values[0]} ${"number" == typeof values[2] ? bh.utils.formatNumber(values[2]) : values[2]}`).join(" &nbsp; ") +
                "</span></div>"
            );
        }
        function cardsToCollectionCount(myCards, rarityType, rarityCount) {
            let cards = [];
            myCards
                .filter((card) => card.rarityType === rarityType)
                .forEach((card) => {
                    let found = cards.find((c) => c.name === card.name);
                    found || cards.push((found = { name: card.name, count: 0 })), (found.count += card.count);
                });
            let count = cards.reduce((count, card) => (count += card.count), 0),
                unique = cards.map((card) => card.name).reduce((out, curr) => (out.includes(curr) ? out : out.concat([curr])), []).length,
                duplicate = cards
                    .filter((card) => card.count > 1)
                    .map((card) => card.name)
                    .reduce((out, curr) => (out.includes(curr) ? out : out.concat([curr])), []).length;
            return {
                rarityCount: rarityCount,
                rarityType: rarityType,
                count: count,
                unique: unique,
                uniquePercent: Math.floor((100 * unique) / rarityCount),
                duplicate: duplicate,
                duplicatePercent: Math.floor((100 * duplicate) / rarityCount),
            };
        }
        bh.formatSummaryRow = formatSummaryRow;
        class Player extends bh.Cacheable {
            constructor(json, isArena = !1) {
                super(), (this.isArena = isArena), (this._arenaUpdate = new bh.ArenaInfo()), bh.data.isPlayer(json) && (this._pp = json), bh.data.isGuildPlayer(json) && (this._gp = json);
            }
            get activeBattleCards() {
                return this.fromCache("activeBattleCards", () => this.battleCards.filter((battleCard) => battleCard.isActive));
            }
            get activeRecipes() {
                return this.fromCache("activeRecipes", () => this.activeBattleCards.map((bc) => new bh.Recipe(bc, !0)).filter((r) => !!r));
            }
            get arenaInfo() {
                return this._arenaUpdate || null;
            }
            set arenaInfo(arenaUpdate) {
                this._arenaUpdate = arenaUpdate || new bh.ArenaInfo();
            }
            get averagePowerPercent() {
                return this.fromCache("averagePowerPercent", () => {
                    let percents = this.heroes.map((ph) => ph.powerPercent);
                    return Math.floor(percents.reduce((out, p) => out + p, 0) / percents.length);
                });
            }
            get battleCards() {
                return this.fromCache("battleCards", () => (this._pp && this._pp.playerCards && this._pp.playerCards.cards ? this.sortAndReduceBattleCards(Object.keys(this._pp.playerCards.cards)) : []));
            }
            get boosterCards() {
                return this.fromCache("boosterCards", () => {
                    let map = this._pp && this._pp.feederCardsMap;
                    return map
                        ? Object.keys(map)
                              .map((guid) => new bh.PlayerBoosterCard(guid, map[guid]))
                              .sort(bh.utils.sort.byElementThenRarityThenName)
                        : [];
                });
            }
            get boosterCount() {
                return this.fromCache("boosterCount", () => {
                    let count = 0,
                        map = this._pp && this._pp.feederCardsMap;
                    return Object.keys(map || {}).map((guid) => (count += map[guid])), count;
                });
            }
            get boosterRowHtml() {
                return this._pp ? bh.PlayerBoosterCard.rowHtml(this.boosterCount) : "";
            }
            get collectionCounts() {
                return this.fromCache("collectionCounts", () =>
                    bh.RarityRepo.allTypes.map((rarityType) => {
                        let myCards = this.battleCards,
                            rarityCards = bh.data.BattleCardRepo.all.filter((card) => card.rarityType === rarityType),
                            rarityAllCount = rarityCards.length,
                            rarityBragCount = rarityCards.filter((card) => card.brag).length,
                            rarityNonCount = rarityCards.filter((card) => !card.brag).length;
                        return {
                            all: cardsToCollectionCount(myCards, rarityType, rarityAllCount),
                            brag: cardsToCollectionCount(
                                myCards.filter((card) => card.brag),
                                rarityType,
                                rarityBragCount
                            ),
                            dupe: cardsToCollectionCount(
                                myCards.filter((card) => card.count > 1),
                                rarityType,
                                rarityAllCount
                            ),
                            non: cardsToCollectionCount(
                                myCards.filter((card) => !card.brag),
                                rarityType,
                                rarityNonCount
                            ),
                            maxedAll: cardsToCollectionCount(
                                myCards.filter((card) => card.isMaxed),
                                rarityType,
                                rarityAllCount
                            ),
                            maxedBrag: cardsToCollectionCount(
                                myCards.filter((card) => card.brag && card.isMaxed),
                                rarityType,
                                rarityBragCount
                            ),
                            maxedDupe: cardsToCollectionCount(
                                myCards.filter((card) => card.count > 1 && card.isMaxed),
                                rarityType,
                                rarityAllCount
                            ),
                            maxedNon: cardsToCollectionCount(
                                myCards.filter((card) => !card.brag && card.isMaxed),
                                rarityType,
                                rarityNonCount
                            ),
                            rarityAllCount: rarityAllCount,
                            rarityBragCount: rarityBragCount,
                            rarityNonCount: rarityNonCount,
                            rarityType: rarityType,
                        };
                    })
                );
            }
            get collectionPercentRowHtml() {
                return this._pp
                    ? formatSummaryRow([["battlecards", "BattleCard", ""]].concat(this.collectionCounts.map((c) => [bh.RarityType[c.rarityType][0], 0, `${c.all.uniquePercent < 100 ? c.all.uniquePercent : 100 + c.all.duplicatePercent}%`])))
                    : "";
            }
            get completionPercent() {
                return this.fromCache("completionPercent", () => {
                    let heroes = this.heroes,
                        completionLevel = 0;
                    return heroes.forEach((hero) => (completionLevel += hero.completionLevel)), Math.round((100 * completionLevel) / (bh.HeroRepo.MaxCompletionLevel * heroes.length));
                });
            }
            get totalDungeonStars() {
                return this.fromCache("totalDungeonStars", () => {
                    let total = 0;
                    return Object.keys(this._pp.dungeonResults).forEach((key) => (total += this._pp.dungeonResults[key].stars)), total;
                });
            }
            get dungeonKeys() {
                return (this._pp && this._pp.stamina) || 0;
            }
            get dungeonKeysRowHtml() {
                return this._pp ? formatRow("keys", "SilverKey", `Dungeon Keys (<span data-seconds-to-more="${(this._pp && this._pp.secondsToMoreStamina) || 0}"></span>)`, this.dungeonKeys, `${this.guid}-stamina`) : "";
            }
            get fameLevel() {
                return ((this._pp && this._pp.fameLevel) || this._gp.fameLevel) + 1;
            }
            get fragments() {
                return (this._pp && this._pp.fragments) || 0;
            }
            get fragsGemsRaidsRowHtml() {
                return this._pp
                    ? formatSummaryRow([
                          ["misc", "Fragments", this.fragments],
                          ["misc", "GemStone", this.gems],
                          ["keys", "RaidTicket", this.raidTickets],
                      ])
                    : "";
            }
            get gems() {
                return (this._pp && this._pp.gems) || 0;
            }
            get gold() {
                return (this._pp && this._pp.gold) || 0;
            }
            set gold(gold) {
                this._pp && (this._pp.gold = gold), this.clearCache("goldNeeded");
            }
            get goldNeeded() {
                return this.fromCache("goldNeeded", () => {
                    let needed = 0;
                    return (
                        this.heroes.forEach((hero) => (needed += hero.maxMaxGoldNeeded)),
                        this.activeBattleCards.forEach((battleCard) => (needed += battleCard.maxMaxGoldNeeded)),
                        this.heroes.forEach((playerHero) => (needed += playerHero ? playerHero.trait.maxGoldCost + playerHero.active.maxGoldCost + playerHero.passive.maxGoldCost : 0)),
                        needed
                    );
                });
            }
            get goldRowHtml() {
                if (!this._pp) return "";
                let needed = this.goldNeeded,
                    asterisk = "<sup>*</sup>",
                    badge;
                return formatRow("misc", "Coin", "Gold", needed ? `${bh.utils.formatNumber(this.gold)} / ${bh.utils.formatNumber(Math.abs(needed))}${asterisk}` : bh.utils.formatNumber(this.gold));
            }
            get guid() {
                return (this._pp && this._pp.id) || this._gp.playerId;
            }
            get guild() {
                return bh.data.guilds.findByGuid(this.guildGuid);
            }
            get guildGuid() {
                return this._pp ? this._pp.playerGuild || null : (this._gp && this._gp.guildId) || null;
            }
            get guildParent() {
                let guildName = bh.data.guilds.findNameByGuid(this.guildGuid);
                return (guildName && guildName.parent) || null;
            }
            get guilds() {
                return this.fromCache("guilds", () => {
                    let guilds = bh.data.guilds.filterNamesByParent(this.guildParent);
                    if (!guilds.length) {
                        let guildName = bh.data.guilds.findNameByGuid(this.guildGuid);
                        guildName && guilds.push(guildName);
                    }
                    return guilds;
                });
            }
            get hasWarBragEquipped() {
                return this.fromCache("hasWarBragEquipped", () => {
                    let war = bh.data.getActiveGuildWar() || bh.data.getNextGuildWar() || {},
                        bragGuid = war.bragGuid,
                        bragName = war.bragName;
                    return void 0 !== this.heroes.find((hero) => void 0 !== hero.deck.find((pbc) => pbc.playerCard.configId === bragGuid || pbc.name === bragName));
                });
            }
            get heroes() {
                return this.fromCache("heroes", () => {
                    let archetypes;
                    return (archetypes = this._pp
                        ? bh.data.HeroRepo.all.map((hero) => this._pp.archetypes.find((arch) => arch.id == hero.guid) || bh.HeroRepo.getLockedArchetype(this.guid, hero.guid))
                        : Object.keys(this._gp.archetypeLevels).map((guid) => ({ playerId: this.guid, id: guid, level: this._gp.archetypeLevels[guid] })))
                        .filter((archetype) => !["spirit-might-hero-guid", "air-magic-hero-guid"].includes(archetype.id))
                        .map((archetype) => new bh.PlayerHero(this, archetype));
                });
            }
            get htmlFriendlyName() {
                return String(this.name).replace(/\</g, "&lt;").replace(/\>/g, "&gt;");
            }
            get inventory() {
                return this.fromCache("inventory", () => {
                    let mats = this._pp && this._pp.craftingMaterials;
                    return bh.data.ItemRepo.allSortedByName.map((item) => new bh.PlayerInventoryItem(this, item, mats[item.guid] || 0));
                });
            }
            get isAlly() {
                return this.fromCache("isAlly", () => !!((Player.me && Player.me.guilds) || []).find((g) => g.guid == this.guildGuid));
            }
            get isExtended() {
                return !!this._pp && this.monthlyRewardDay;
            }
            get isFullMeat() {
                return this.fromCache(
                    "isFullMeat",
                    () => this.heroes.length == bh.data.HeroRepo.all.filter((hero) => !["spirit-might-hero-guid", "air-magic-hero-guid"].includes(hero.guid)).length && !this.heroes.find((hero) => !hero.isMeat)
                );
            }
            get isMe() {
                return bh.Messenger.ActivePlayerGuid == this.guid;
            }
            get monthlyRewardDay() {
                return this._pp && this._pp.dailyLoginInfo ? this._pp.dailyLoginInfo.currentDay + 1 : 0;
            }
            get monthlyRewardMonth() {
                return this._pp && this._pp.dailyLoginInfo ? this._pp.dailyLoginInfo.currentMonth + 1 : 0;
            }
            get monthlyRewardRowHtml() {
                let card = bh.BattleCardRepo.getMonthlyCard(this.monthlyRewardMonth - 1);
                return this._pp ? formatRow("misc", "Gift", `Monthly Reward (${this.monthlyRewardMonth}): ${(card && card.name) || "?"}`, `Day ${this.monthlyRewardDay} / 31`) : "";
            }
            get monthlyRewardsClaimed() {
                return this._pp && this._pp.dailyLoginInfo ? this._pp.dailyLoginInfo.claimedSRCards : [];
            }
            get name() {
                return this._pp ? this._pp.name : (this._gp && this._gp.name) || null;
            }
            get position() {
                return (this._gp && this._gp.position) || null;
            }
            get powerPercent() {
                return this.fromCache("powerPercent", () => {
                    let percentSum = this.heroes.map((ph) => ph.powerPercent).reduce((score, pp) => score + pp, 0),
                        max = 100 * bh.data.HeroRepo.length;
                    return Math.floor((100 * percentSum) / max);
                });
            }
            get powerRating() {
                return this.fromCache("powerRating", () => this.heroes.reduce((power, hero) => power + hero.powerRating, 0));
            }
            get raidTickets() {
                return (this._pp && this._pp.raidKeys) || 0;
            }
            get wildCardRowHtml() {
                return this._pp ? formatSummaryRow([["cardtypes", "WildCard", ""]].concat(this.wildCards.map((wc) => [bh.RarityType[wc.rarityType][0], 0, bh.utils.formatNumber(wc.count)]))) : "";
            }
            get wildCards() {
                return this.fromCache("wildCards", () => bh.data.WildCardRepo.all.map((wc) => new bh.PlayerWildCard(this, wc.guid)));
            }
            battleCardToPlayerBattleInfo(guid) {
                let playerCard = this._pp.playerCards.cards[guid];
                return new bh.PlayerBattleCard(playerCard);
            }
            addCraftingMaterial(args) {
                let craftingMaterials = (this._pp && this._pp.craftingMaterials) || {};
                (craftingMaterials[args.material] = (craftingMaterials[args.material] || 0) + args.quantity), this.clearCache("inventory");
            }
            addFeederCard(args) {
                let feederCards = (this._pp && this._pp.feederCardsMap) || {};
                (feederCards[args.card] = (feederCards[args.card] || 0) + args.quantity), this.clearCache("boosterCards", "boosterCount");
            }
            filterActiveBattleCards(...args) {
                let element, rarity, name, hero;
                return (
                    args.forEach((arg) => (bh.ElementRepo.isElement(arg) ? (element = arg) : bh.RarityRepo.isRarity(arg) ? (rarity = arg) : (name = arg))),
                    name && (hero = bh.data.HeroRepo.find(name)),
                    this.activeBattleCards.filter((battleCard) => battleCard.matchesElement(element) && battleCard.matchesRarity(rarity) && battleCard.matchesHero(hero))
                );
            }
            filterHeroes(elementOrName) {
                let element = bh.ElementRepo.isElement(elementOrName) ? elementOrName : null,
                    name = element ? null : elementOrName;
                return this.heroes.filter((playerHero) => playerHero && ((element && bh.ElementType[playerHero.elementType] == element) || (name && playerHero.name == name)));
            }
            listCardsNotMaxed() {
                let cards = (this._pp && this._pp.playerCards && this._pp.playerCards.cards) || {},
                    keys,
                    cardsWithEvo;
                Object.keys(cards)
                    .map((key) => cards[key])
                    .filter((card) => card.evolutionLevel > 0)
                    .forEach((card) => {
                        let battleCard = bh.data.BattleCardRepo.find(card.configId),
                            matKeys;
                        Object.keys(card.evolutionResults).forEach((matKey) => {
                            let mat = bh.data.ItemRepo.find(matKey),
                                matEvo = card.evolutionResults[matKey],
                                values;
                            Object.values(matEvo).forEach((value, index) => {
                                1 !== Math.round(value) && console.log(`${battleCard.name} - ${(mat && mat.name) || matKey} - Evo ${index} - ${value}`);
                            });
                        });
                    });
            }
            setDungeonKeys(stamina, secondsToMore) {
                bh.$(`#${this.guid}-stamina .badge`).text(stamina), bh.$(`#${this.guid}-stamina [data-seconds-to-more]`).attr("data-seconds-to-more", secondsToMore);
            }
            sortAndReduceBattleCards(guids) {
                let cards = guids.map((guid) => this.battleCardToPlayerBattleInfo(guid)),
                    reduced = [];
                return (
                    cards.forEach((card) => {
                        let existing = reduced.find((c) => c.matches(card));
                        existing ? existing.count++ : reduced.push(card);
                    }),
                    bh.events.sortBattleCardsByTag(reduced)
                );
            }
            static get isMe() {
                return bh.Messenger.ActivePlayerGuid === this.guid;
            }
            static get me() {
                return bh.data.PlayerRepo.find(bh.Messenger.ActivePlayerGuid);
            }
        }
        bh.Player = Player;
    })(bh || (bh = {})),
    (function (bh) {
        class ArenaInfo {
            constructor(_ = null) {
                this._ = _;
            }
            get currentEventRank() {
                return (this._ && this._.currentEventRank + 1) || 0;
            }
            get playerEventRank() {
                return (this._ && this._.playerEventRank + 1) || 0;
            }
            get purchasedStamina() {
                return (this._ && this._.purchasedStamina) || 0;
            }
            get score() {
                return (this._ && this._.score) || 0;
            }
            get stamina() {
                return (this._ && this._.stamina) || 0;
            }
            get totalPitBattles() {
                return (this._ && this._.totalPitBattles) || 0;
            }
            get totalPitWinPercentage() {
                return (this.totalPitBattles && Math.round((100 * this.totalPitWins) / this.totalPitBattles)) || 0;
            }
            get totalPitWins() {
                return (this._ && this._.totalPitWins) || 0;
            }
            get winStreak() {
                return (this._ && this._.winStreak) || 0;
            }
            get arenaRowHtml() {
                return this._
                    ? bh.formatSummaryRow([
                          ["keys", "GoldKey", this._.stamina],
                          ["misc", "ArenaScore", this._.score],
                          ["misc", "ArenaRank", this._.currentEventRank],
                          ["misc", "ArenaStreak", this._.winStreak],
                      ])
                    : "";
            }
        }
        bh.ArenaInfo = ArenaInfo;
    })(bh || (bh = {})),
    (function (bh) {
        class CommandResponse {
            constructor(json) {
                this.json = json;
            }
            get guids() {
                return this.jsonGuids || (this.jsonGuids = Object.keys(this.json) || []);
            }
            get responses() {
                return this.jsonResponses || (this.jsonResponses = bh.utils.flat(this.guids.map((guid) => this.getResponses(guid))));
            }
            findCommand(cmd) {
                return this.responses.find((response) => response.cmd === cmd);
            }
            findResponse(fn) {
                return this.responses.find((response) => fn(response));
            }
            getResponses(guid) {
                return this.json[guid] || [];
            }
            static getStaminaIterations(json) {
                let commandResponse,
                    response = new CommandResponse(json).findResponse((response) => (response.resp && response.resp.cost && !!response.resp.stamina) || !1),
                    resp = (response && response.resp) || null,
                    cost = (resp && resp.cost) || 0,
                    stamina = (resp && resp.stamina) || 0;
                return stamina && cost ? Math.floor(stamina / cost) : 0;
            }
            static getStamina(json) {
                let commandResponse,
                    response = new CommandResponse(json).findResponse((response) => (response.resp && (!!response.resp.stamina || !!response.resp.secondsToMoreStamina)) || !1),
                    stamina,
                    secondsToMore;
                return { stamina: (response && response.resp.stamina) || 0, secondsToMoreStamina: (response && response.resp.secondsToMoreStamina) || 0 };
            }
        }
        bh.CommandResponse = CommandResponse;
    })(bh || (bh = {})),
    (function (bh) {
        class Dungeon extends bh.Cacheable {
            constructor(data) {
                super(),
                    (this.data = data),
                    "string" == typeof data.crystals && (data.crystals = data.crystals.split(/\s+,\s+/).filter((s) => s)),
                    "string" == typeof data.mats && (data.mats = data.mats.split(/\s+,\s+/).filter((s) => s)),
                    "string" == typeof data.runes && (data.runes = data.runes.split(/\s+,\s+/).filter((s) => s));
            }
            get act() {
                return this.data.act;
            }
            get boosterElementTypes() {
                return this.data.boosterElementTypes;
            }
            get boosterRarities() {
                return this.data.boosterRarities;
            }
            get crystals() {
                return this.fromCache("crystals", () => this.data.crystals.map((v) => toDropRate(v, this.keys)));
            }
            get dungeon() {
                return this.data.dungeon;
            }
            get difficulty() {
                return this.data.difficulty;
            }
            get elementTypes() {
                return this.data.elementTypes;
            }
            get fame() {
                return this.data.fame;
            }
            get guid() {
                return this.data.guid;
            }
            get gold() {
                return this.data.gold;
            }
            get keys() {
                return this.data.keys;
            }
            get lower() {
                return this.data.lower;
            }
            get mats() {
                return this.fromCache("mats", () => this.data.mats.map((v) => toDropRate(v, this.keys)));
            }
            get name() {
                return this.data.name;
            }
            get randomMats() {
                return this.data.randomMats;
            }
            get runes() {
                return this.fromCache("runes", () => this.data.runes.map((v) => toDropRate(v, this.keys)));
            }
            findDrop(value) {
                return this.fromCache("findDrop." + value, () => {
                    let drop = this.crystals.find((dr) => dr.name == value.split(" ")[0]) || this.runes.find((dr) => dr.name == value.split("'")[0]) || this.mats.find((dr) => dr.name == value);
                    return (drop && { dungeon: this, dropRate: drop }) || null;
                });
            }
        }
        function toDropRate(value, keys) {
            let parts = value.split("|"),
                percentMultiplier = +parts[1].match(/(\d+)/)[1] / 100,
                minMax = parts[2].split("-"),
                min = +minMax[0],
                max = +minMax[1] || min,
                average = ((min + max) / 2) * percentMultiplier,
                averagePerKey = average / keys;
            return { name: parts[0], percent: parts[1], percentMultiplier: percentMultiplier, min: min, max: max, average: average, averagePerKey: averagePerKey };
        }
        bh.Dungeon = Dungeon;
    })(bh || (bh = {})),
    (function (bh) {
        class EvoReport {
            constructor(card, evo) {
                (this.wildCards = bh.data.wildsForEvo(card.rarityType, evo)),
                    (this.minSot = bh.data.getMinSotNeeded(card.rarityType, evo)),
                    (this.maxSot = bh.data.getMaxSotNeeded(card.rarityType, evo)),
                    (this.minGold = bh.data.getMinGoldNeeded(card.rarityType, evo));
            }
        }
        bh.EvoReport = EvoReport;
        class EvoReportCard extends bh.Cacheable {
            constructor(card) {
                super(), (this.reports = []);
                let evo = card.evo,
                    max = bh.data.getMaxEvo(card.rarityType);
                for (let i = evo; i < max; i++) this.reports.push(new EvoReport(card, i));
            }
            get next() {
                return this.reports[0];
            }
            get wildCards() {
                return this.fromCache("wildCards", () => this.reports.reduce((count, report) => count + report.wildCards, 0));
            }
            get minSot() {
                return this.fromCache("minSot", () => this.reports.reduce((count, report) => count + report.minSot, 0));
            }
            get maxSot() {
                return this.fromCache("maxSot", () => this.reports.reduce((count, report) => count + report.maxSot, 0));
            }
            get minGold() {
                return this.fromCache("minGold", () => this.reports.reduce((count, report) => count + report.minGold, 0));
            }
            get maxGold() {
                return this.fromCache("maxGold", () => this.reports.reduce((count, report) => count + report.maxGold, 0));
            }
        }
        bh.EvoReportCard = EvoReportCard;
    })(bh || (bh = {})),
    (function (bh) {
        class GameEffect extends bh.Cacheable {
            constructor(raw) {
                super(), (this.raw = raw);
                let parts = GameEffect.matchEffect(raw),
                    cleanValue = (parts && parts[1]) || raw,
                    effect = bh.data.EffectRepo.find(cleanValue);
                (this.effect = (effect && effect.name) || cleanValue),
                    (this.percent = (parts && parts[2] && `${parts[2]}%`) || null),
                    (this.percentMultiplier = (this.percent && +parts[2] / 100) || null),
                    (this.turns = (parts && +parts[3]) || null),
                    (this.value = effect && effect.value),
                    (this.perkMultiplier = 0),
                    (this.offense = !((effect && effect.value) || "").toLowerCase().startsWith("d")),
                    (this.rawTarget = (parts && parts[4]) || null);
            }
            static matchEffect(raw) {
                if ("Critical" == raw) return ["Critical", "Critical"];
                if ("Splash Enemy" == raw) return ["Splash", "Splash"];
                let match = raw.match(/([a-zA-z]+(?: [a-zA-Z]+)*)(?: (\d+)%)?(?: (\d+)T)?(?: (Enemy|Ally|Self))/i);
                return match ? Array.from(match) : ((match = raw.match(/([a-zA-z]+(?: [a-zA-Z]+)*)(?: (\d+)T)?(?: (\d+)%)?(?: (Enemy|Ally|Self))/i)) && [match[0], match[1], match[3], match[2], match[4]]) || null;
            }
            get powerRating() {
                return this.fromCache("powerRating", () => getPowerRating(this));
            }
            static parse(value) {
                if (!value) return null;
                let gameEffect = new GameEffect(value);
                return (gameEffect.effect && gameEffect) || null;
            }
            static parseAll(playerCard) {
                if (!playerCard) return [];
                let card = bh.data.BattleCardRepo.find(playerCard.configId);
                if (!card) return [];
                let perkMultiplier = bh.BattleCardRepo.getPerk(card, playerCard.evolutionLevel) / 100,
                    gameEffects = [];
                return (
                    card.effects.forEach((effectValue) => {
                        let gameEffect = GameEffect.parse(effectValue);
                        if (!gameEffect) return console.error(`GameEffect.parse: ${effectValue}`);
                        (gameEffect.card = card), gameEffects.push(gameEffect);
                    }),
                    card.perks.forEach((perkValue) => {
                        let gameEffect = GameEffect.parse(perkValue);
                        if (!gameEffect) return console.error(`GameEffect.parse: ${perkValue}`);
                        (gameEffect.card = card), (gameEffect.perkMultiplier = perkMultiplier), gameEffects.push(gameEffect);
                    }),
                    reconcileTargets(gameEffects, card),
                    gameEffects
                );
            }
        }
        function reconcileTargets(gameEffects, card) {
            let targets = card.typesTargets.map((typeTarget) => bh.PlayerBattleCard.parseTarget(typeTarget)),
                damage = targets.find((t) => "Damage" == t.type),
                def = targets.find((t) => ["Heal", "Shield"].includes(t.type));
            gameEffects.slice().forEach((gameEffect) => {
                if ((["Leech", "Sap"].includes(gameEffect.effect) && (gameEffect.rawTarget = "Enemy"), "Critical" == gameEffect.effect))
                    (gameEffect.target = targets[0]),
                        targets.slice(1).forEach((t) => {
                            let ge = GameEffect.parse(gameEffect.raw);
                            (ge.target = t), gameEffects.push(ge);
                        });
                else if ("Splash Damage" == gameEffect.effect);
                else if (["Enemy", "enemy"].includes(gameEffect.rawTarget)) gameEffect.target = damage || bh.PlayerBattleCard.parseTarget(def.all ? "Damage All Enemies" : "Damage Single Enemy");
                else if ("Ally" == gameEffect.rawTarget) {
                    let healOrShield = (def && def.type) || "Heal";
                    gameEffect.target = bh.PlayerBattleCard.parseTarget((damage || def).all ? `${healOrShield} All Allies` : `${healOrShield} Single Ally`);
                } else if ("Self" == gameEffect.rawTarget) {
                    let healOrShield = (def && def.type) || "Heal";
                    gameEffect.target = bh.PlayerBattleCard.parseTarget(`${healOrShield} Self`);
                } else gameEffect.target || console.warn("can't find target for " + gameEffect.effect, gameEffect.card);
            });
        }
        function getPowerRating(gameEffect) {
            if (["Critical", "Regen", "Splash Damage"].includes(gameEffect.effect)) return 0;
            let match = (gameEffect.value || "").toUpperCase().match(/(O|D)?((?:\+|\-)?\d+(?:\.\d+)?)(T)?(%)?/),
                effectOffense = match && "O" == match[1],
                effectDefense = match && "D" == match[1],
                points = (match && +match[2]) || 1,
                turns = match && "T" == match[3] ? gameEffect.turns : 1,
                percentMultiplier = match && "%" == match[4] ? gameEffect.percentMultiplier : 1,
                value = match ? points * turns * percentMultiplier : 0.5,
                target = gameEffect.target,
                targetOffense = target && target.offense,
                targetDefense = target && !target.offense,
                oppoMultiplier = targetOffense == effectOffense || targetDefense == effectDefense ? 1 : -1,
                perkMultiplier = gameEffect.perkMultiplier || 1;
            return target ? value * perkMultiplier * oppoMultiplier : (console.warn("no target", gameEffect), 0);
        }
        bh.GameEffect = GameEffect;
    })(bh || (bh = {})),
    (function (bh) {
        function createHeroAbility(hero, heroAbility) {
            return { hero: hero, guid: heroAbility.abilityGuid, name: heroAbility.abilityName, type: heroAbility.abilityType };
        }
        class Hero extends bh.Cacheable {
            constructor(heroAbilities) {
                super();
                let trait = heroAbilities[0],
                    active = heroAbilities[1],
                    passive = heroAbilities[2];
                (this.guid = trait.heroGuid),
                    (this.name = trait.heroName),
                    (this.elementType = trait.elementType),
                    (this.klassType = trait.klassType),
                    (this.trait = createHeroAbility(this, trait)),
                    (this.active = createHeroAbility(this, active)),
                    (this.passive = createHeroAbility(this, passive)),
                    (this.lower = this.name.toLowerCase());
            }
            get abilities() {
                return [this.trait, this.active, this.passive];
            }
            get allBattleCards() {
                return this.fromCache("allBattleCards", () => Hero.filterCardsByHero(this, bh.data.BattleCardRepo.all));
            }
            getHitPoints(level) {
                return this.fromCache("getHitPoints." + level, () => Hero.getHitPoints(this, level));
            }
            get maxPowerRating() {
                return this.fromCache("maxPowerRating", () => bh.PowerRating.rateMaxedHero(this));
            }
            get maxPowerThresholds() {
                return this.fromCache("maxPowerThresholds", () => bh.RarityRepo.allTypes.map((r) => bh.PowerRating.rateMaxedHero(this, r)));
            }
            static filterCardsByHero(hero, cards) {
                return cards.filter((card) => card.klassType === hero.klassType && (card.elementType == bh.ElementType.Neutral || card.elementType == hero.elementType));
            }
            static getHitPoints(hero, level) {
                switch (hero.name) {
                    case "Bree":
                    case "Hawkeye":
                    case "Krell":
                        return Math.floor(5 * level * level + 2.5 * level + 167.5);
                    case "Monty":
                    case "Trix":
                        return Math.floor(4.286 * level * level + 2.142 * level + 143.572);
                    case "Jinx":
                    case "Logan":
                    case "Red":
                        return 4 * level * level + 2 * level + 134;
                    case "Fergus":
                        return 6 * level * level + 3 * level + 201;
                    case "Brom":
                    case "Gilda":
                        return Math.floor(5.714 * level * level + 2.858 * level + 191.438);
                    case "Peg":
                        return Math.floor(4.5 * level * level + 2 * level + 153.5);
                    case "Thrudd":
                        return Math.floor((38 / 7) * level * level + (19 / 7) * level + 190 - 38 / 7 - 19 / 7);
                    default:
                        return 0;
                }
            }
        }
        bh.Hero = Hero;
    })(bh || (bh = {})),
    (function (bh) {
        let messenger;
        class Messenger {
            constructor(win, callbackfn, _targetWindow = null) {
                (this.win = win),
                    (this.callbackfn = callbackfn),
                    (this._targetWindow = _targetWindow),
                    window.addEventListener("message", (ev) => {
                        let message = ev.data || (ev.originalEvent && ev.originalEvent.data) || null;
                        Messenger.isValidMessage(message) && (this.updateActive(message), this.callbackfn(message));
                    });
            }
            get targetWindow() {
                if (!this._targetWindow) {
                    if (bh.isHud) {
                        let iframe = bh.$("#gameiframe")[0];
                        this._targetWindow = (iframe && iframe.contentWindow) || null;
                    }
                    bh.isListener && (this._targetWindow = (this.win && this.win.parent) || null);
                }
                return this._targetWindow || console.warn("no target window: " + location.href), this._targetWindow;
            }
            updateActive(message) {
                message.playerGuid !== message.action &&
                    message.sessionKey !== message.action &&
                    ((Messenger.ActivePlayerGuid && Messenger.ActivePlayerGuid === message.playerGuid) || (Messenger.ActivePlayerGuid = message.playerGuid),
                    (Messenger.ActiveSessionKey && Messenger.ActiveSessionKey === message.sessionKey) || (Messenger.ActiveSessionKey = message.sessionKey));
            }
            postMessage(message) {
                Messenger.isValidMessage(message) && this.targetWindow
                    ? (this.updateActive(message), this.targetWindow.postMessage(message, "*"))
                    : this.targetWindow
                    ? console.warn(`invalid message: ${(message && message.action) || "[no message]"}`)
                    : console.warn(`no target window: ${(message && message.action) || "[no message]"}`);
            }
            static isValidMessage(message) {
                if (!message) return !1;
                let keys = Object.keys(message);
                return keys.includes("action") && keys.includes("playerGuid") && keys.includes("sessionKey") && keys.includes("data");
            }
            static createMessage(action, data) {
                return { action: action, data: data, guildGuid: void 0, playerGuid: Messenger.ActivePlayerGuid, sessionKey: Messenger.ActiveSessionKey };
            }
            static initialize(targetWindow, callbackfn) {
                return (messenger = new Messenger(targetWindow, callbackfn));
            }
            static get instance() {
                return messenger;
            }
            static send(action, data) {
                Messenger.instance.postMessage(Messenger.createMessage(action, data));
            }
        }
        bh.Messenger = Messenger;
    })(bh || (bh = {})),
    (function (bh) {
        function typesTargetsToTargets(values) {
            return values
                .map((s) => s.trim())
                .filter((s) => !!s)
                .map((s) => {
                    let parts = s.split(" "),
                        all = "All" == parts[1],
                        single = "Single" == parts[1],
                        splash = "Splash" == parts[1],
                        self = "Self" == parts[1];
                    if (s.includes("Flurry")) {
                        if (self) return "Self Flurry";
                        if (all) return "Multi Flurry";
                        if (single) return "Single Flurry";
                    }
                    return self ? "Self" : single ? "Single" : all ? "Multi" : splash ? "Splash" : (console.log(`Target of "${s}"`), s);
                });
        }
        function isValidEffectOrPerk(playerBattleCard, gameEffect) {
            //console.log(gameEffect)
            return (
                (!gameEffect.perkMultiplier || 1 == gameEffect.perkMultiplier) &&
                (("Accuracy Down" == gameEffect.effect && "100%" == gameEffect.percent) ||
                 ("Sleep" == gameEffect.effect && gameEffect.turns > 1 && gameEffect.target.offense) ||
                 ("Defence Up" == gameEffect.effect && "100%" == gameEffect.percent) ||
                 !("Haste" != gameEffect.effect || !gameEffect.target.all) ||
                 ("Haste" == gameEffect.effect && gameEffect.turns > playerBattleCard.turns) ||
                 !("Trait Up" != gameEffect.effect || !gameEffect.target.all) ||
                 ("Evade" == gameEffect.effect && "100%" == gameEffect.percent && gameEffect.turns > playerBattleCard.turns))
            );
        }
        function getIsOP(playerBattleCard) {
            //console.log(playerBattleCard.targets)
            return bh.Cacheable.fromCache("PlayerBattleCard.getIsOP." + playerBattleCard.guid, () => {
                if (playerBattleCard.rarityType != bh.RarityType.SuperRare && playerBattleCard.rarityType != bh.RarityType.Legendary) return !1;
                let isOp = null != getOpEffects(playerBattleCard).find((gameEffect) => isValidEffectOrPerk(playerBattleCard, gameEffect));
                return isOp || (isOp = null != getComboOpEffects(playerBattleCard).find((gameEffects) => !gameEffects.map((gameEffect) => !gameEffect.perkMultiplier || 1 == gameEffect.perkMultiplier).includes(!1))), isOp;
            });
        }
        function getOpEffects(playerBattleCard) {
            //let opEffects = getOpEffects(playerBattleCard).filter((gameEffect) => isValidEffectOrPerk(playerBattleCard, gameEffect));
            let opEffects = bh.GameEffect.parseAll(playerBattleCard.playerCard).filter((gameEffect) => bh.OpEffects.includes(gameEffect.effect));
            return bh.Cacheable.fromCache("PlayerBattleCard.getOpEffects." + playerBattleCard.guid, () => (playerBattleCard.rarityType != bh.RarityType.SuperRare && playerBattleCard.rarityType != bh.RarityType.Legendary) ? [] : opEffects);
        }
        function getComboOpEffects(playerBattleCard) {
            return bh.Cacheable.fromCache("PlayerBattleCard.getComboOpEffects." + playerBattleCard.guid, () => {
                let gameEffects = bh.GameEffect.parseAll(playerBattleCard.playerCard);
                return bh.OpCombos.map((effects) => {
                    let matches = effects.map((effect) => gameEffects.find((gameEffect) => gameEffect.effect == effect)).filter((e) => e);
                    return (matches.length == effects.length && matches) || [];
                }).filter((a) => a.length);
            });
        }
        (bh.OpEffects = ["Accuracy Down", "Sleep", "Defence Up", "Haste", "Trait Up", "Evade", "Prevent Haste", "Awaken"]), (bh.OpCombos = [["Interrupt", "Slow"]]);
        class PlayerBattleCard extends bh.Cacheable {
            constructor(playerCard) {
                super(), (this.playerCard = playerCard), (this.count = 1), (this._bc = bh.data.BattleCardRepo.find(playerCard.configId)), this._bc || bh.utils.logMissingCard(this);
            }
            _rowChildren() {
                let html = "";
                if (!this.isUnknown) {
                    let me = bh.Player.me,
                        activeRecipe = new bh.Recipe(this, !0);
                    if (me && activeRecipe) {
                        let goldNeeded = bh.data.calcMaxGoldNeeded(this.playerCard, this.evoLevel) * this.count,
                            goldOwned = me.gold,
                            goldColor = goldOwned < goldNeeded ? "bg-danger" : "bg-success";
                        (html += `<div>${bh.getImg20("misc", "Coin")} Gold <span class="badge pull-right ${goldColor}">${bh.utils.formatNumber(goldOwned)} / ${bh.utils.formatNumber(goldNeeded)}</span></div>`),
                            activeRecipe.all.forEach((recipeItem) => {
                                if (recipeItem.max) {
                                    let item = recipeItem.item,
                                        guid = item.guid,
                                        playerItem = me.inventory.find((item) => item.guid == guid),
                                        count = (playerItem && playerItem.count) || 0;
                                    html += bh.PlayerInventoryItem.toRowHtml(item, count, recipeItem.max * this.count);
                                }
                            });
                        let wcNeeded = bh.data.getMaxWildCardsNeeded(this) * this.count,
                            wc = me.wildCards[this.rarityType],
                            iwc = (!wc && bh.data.WildCardRepo.find(bh.RarityType[this.rarityType])) || null,
                            wcOwned = (wc && me.wildCards[this.rarityType].count) || 0;
                        html += bh.PlayerWildCard.toRowHtml(wc || iwc, wcOwned, wcNeeded);
                        let runesNeeded = bh.data.calcMaxRunesNeeded(this.playerCard, this.evoLevel),
                            rune = me.inventory.find((item) => item.isRune && this.matchesHero(bh.data.HeroRepo.find(item.name.split("'")[0]))),
                            runesOwned = (rune && rune.count) || 0;


                       //console.log(me.inventory.find((item) => item.isRune && this.matchesHero(bh.data.HeroRepo.find(item.name.split("'")[0]))));
                        runesNeeded && rune && (html += bh.PlayerInventoryItem.toRowHtml(rune, runesOwned, runesNeeded));
                        let crystalsNeeded = bh.data.calcMaxCrystalsNeeded(this.playerCard, this.evoLevel),
                            crystal = me.inventory.find((item) => item.isCrystal && this.elementType == item.elementType),
                            crystalsOwned = (crystal && crystal.count) || 0;
                        crystalsNeeded && crystal && (html += bh.PlayerInventoryItem.toRowHtml(crystal, crystalsOwned, crystalsNeeded));
                    }
                }
                return html;
            }
            _rowHtml(hero, badgeValue, badgeCss, powerRating = !0) {
                let badgeHtml = badgeValue ? `<span class="badge pull-right ${badgeCss || ""}">${badgeValue}</span>` : "",
                    children = "number" == typeof badgeValue || this.isMaxed ? "" : this._rowChildren(),
                    content = bh.renderExpandable(this.playerCard.id, `${this.toHeroHtml(hero, powerRating)}${badgeHtml}`, children);
                return `<div data-dblclick-action="sort-battlecards" data-element-type="${this.elementType}" data-rarity-type="${this.rarityType}" data-klass-type="${this.klassType}" data-brag="${this.brag ? "Brag" : ""}">${content}</div>`;
            }
            _heroRowHtml(hero, isMe, powerRating = !0) {
                let badgeHtml = "",
                    children = isMe ? this._rowChildren() : ``,
                    content = bh.renderExpandable(this.playerCard.id, `${this.toHeroHtml(hero, powerRating)}${badgeHtml}`, children);
                return `<div data-dblclick-action="sort-battlecards" data-element-type="${this.elementType}" data-rarity-type="${this.rarityType}" data-klass-type="${this.klassType}" data-brag="${this.brag ? "Brag" : ""}">${content}</div>`;
            }
            get brag() {
                return (this._bc && this._bc.brag) || !1;
            }
            get effects() {
                return (this._bc && this._bc.effects) || [];
            }
            get elementType() {
                return this._bc ? this._bc.elementType : bh.ElementType.Neutral;
            }
            get inPacks() {
                return (this._bc && this._bc.inPacks) || !1;
            }
            get klassType() {
                return this._bc ? this._bc.klassType : null;
            }
            get lower() {
                return this.name.toLowerCase();
            }
            get mats() {
                return (this._bc && this._bc.mats) || null;
            }
            get maxValues() {
                return (this._bc && this._bc.maxValues) || [];
            }
            get minValues() {
                return (this._bc && this._bc.minValues) || [[]];
            }
            get perkBase() {
                return (this._bc && this._bc.perkBase) || 0;
            }
            get perks() {
                return (this._bc && this._bc.perks) || [];
            }
            get name() {
                return (this._bc && this._bc.name) || (this.playerCard && this.playerCard.configId);
            }
            get rarityType() {
                return this._bc ? this._bc.rarityType : null;
            }
            get targets() {
                return this.fromCache("targets", () => typesTargetsToTargets(this.typesTargets));
            }
            get tier() {
                return (this._bc && this._bc.tier) || "";
            }
            get turns() {
                return (this._bc && this._bc.turns) || 0;
            }
            get types() {
                return this.fromCache("types", () => this.typesTargets.map((s) => s.split(" ")[0].replace("Damage", "Attack")));
            }
            get typesTargets() {
                return (this._bc && this._bc.typesTargets) || [];
            }
            get evo() {
                return (this.playerCard && this.playerCard.evolutionLevel) || 0;
            }
            get guid() {
                return this.playerCard && this.playerCard.configId;
            }
            get level() {
                return (this.playerCard && this.playerCard.level + 1) || 0;
            }
            get battleOrBragImage() {
                return bh.getImg20("cardtypes", this.brag ? "Brag" : "BattleCard");
            }
            get evoLevel() {
                return `${this.evo}.${("0" + this.level).slice(-2)}`;
            }
            get formattedValue() {
                return this.value ? bh.utils.formatNumber(this.value) : "";
            }
            get isActive() {
                return (this.evo > 0 || this.level > 1) && !this.isMaxed;
            }
            get isMaxed() {
                return this.evoLevel == ["1.10", "2.20", "3.35", "4.50", "5.50"][this.rarityType];
            }
            get isOP() {
                return getIsOP(this);
            }
            get isUnknown() {
                return !this._bc;
            }
            get maxWildCardsNeeded() {
                return this.fromCache("maxWildCardsNeeded", () => bh.data.getMaxWildCardsNeeded(this) * this.count);
            }
            get nextWildCardsNeeded() {
                return this.fromCache("nextWildCardsNeeded", () => bh.data.getNextWildCardsNeeded(this) * this.count);
            }
            get maxMaxSotNeeded() {
                return this.fromCache("maxMaxSotNeeded", () => bh.data.calcMaxSotNeeded(this.playerCard, this.evoLevel) * this.count);
            }
            get nextMaxSotNeeded() {
                return this.fromCache("nextMaxSotNeeded", () => bh.data.getMaxSotNeeded(this.rarityType, this.evo) * this.count);
            }
            get maxMaxGoldNeeded() {
                return this.fromCache("maxMaxGoldNeeded", () => bh.data.calcMaxGoldNeeded(this.playerCard, this.evoLevel) * this.count);
            }
            get nextMaxGoldNeeded() {
                return this.fromCache("nextMaxGoldNeeded", () => bh.data.getMaxGoldNeeded(this.rarityType, this.evo) * this.count);
            }
            get opEffects() {
                return this.fromCache("opEffects", () => getOpEffects(this).map((gameEffect) => gameEffect.effect));
            }
            get opEffectCombos() {
                return this.fromCache("ofEffectCombos", () => getComboOpEffects(this).map((gameEffects) => gameEffects.map((gameEffect) => gameEffect.effect).join("-")));
            }
            get rarityEvoLevel() {
                return `${bh.RarityType[this.rarityType][0]}.${this.evoLevel}`;
            }
            get rowHtml() {
                return this._rowHtml(null);
            }
            get scoutHtml() {
                return `${this.rarityEvoLevel} ${this.name} ${this.count > 1 ? `x${this.count}` : ""}`;
            }
            get typeImage() {
                return this.types.length ? bh.getImg12("cardtypes", this.types[0]) : "";
            }
            get value() {
                return this.fromCache("value", () => (this.playerCard && bh.BattleCardRepo.calculateValue(this.playerCard)) || 0);
            }
            matches(other) {
                return this._bc && other._bc && this._bc.guid == other._bc.guid && this.evoLevel == other.evoLevel;
            }
            matchesElement(element) {
                return !element || this.elementType === bh.ElementType[element];
            }
            matchesHero(hero) {
                return !hero || (this.matchesElement(bh.ElementType[hero.elementType]) && this.klassType === hero.klassType);
            }
            matchesRarity(rarity) {
                return !rarity || this.rarityType === bh.RarityType[rarity];
            }
            rateCard(hero) {
                return bh.PowerRating.ratePlayerCard(this.playerCard, hero);
            }
            toHeroRowHtml(hero, isMe) {
                return this._heroRowHtml(hero, isMe);
            }
            toHeroHtml(hero, powerRating = !0) {
                let count = this.count > 1 ? `x${this.count}` : "",
                    typeAndValue = this.value ? ` (${this.typeImage} ${this.formattedValue})` : "",
                    stars = bh.utils.evoToStars(this.rarityType, this.evoLevel),
                    power = powerRating ? `<span class="pull-right">${Math.round(this.rateCard(hero)) * this.count}</span>` : "",
                    name = this.name
                        .replace(/Mischievous/, "Misch.")
                        .replace(/Protection/, "Prot.")
                        .replace(/-[\w-]+-/, "-...-");
                return `${this.battleOrBragImage} ${this.evoLevel} <small>${stars}</small> ${name} ${typeAndValue} ${count} ${power}`;
            }
            toRowHtml(needed, owned, powerRating = !0) {
                return this._rowHtml(null, needed, owned < needed ? "bg-danger" : "bg-success", powerRating);
            }
            static parseTarget(value) {
                return bh.Cacheable.fromCache("PlayerBattleCard.parseTarget." + value, () => {
                    let parts = value.split("Flurry")[0].trim().split(" "),
                        type = parts.shift(),
                        target = parts.join(" "),
                        offense = "Damage" == type,
                        all = target.includes("All Allies") || target.includes("All Enemies"),
                        splash = target.includes("Splash"),
                        self = target.includes("Self"),
                        single = !all && !splash && !self,
                        flurryMatch = value.match(/Flurry \((\d+) @ (\d+)%\)/),
                        flurryCount = (flurryMatch && +flurryMatch[1]) || null,
                        flurryHitPercent = (flurryMatch && `${flurryMatch[2]}%`) || null,
                        flurryHitMultiplier = (flurryMatch && +flurryMatch[2] / 100) || null;
                    return {
                        type: type,
                        typeDivisor: "Damage" == type ? bh.AttackDivisor : "Shield" == type ? bh.ShieldDivisor : bh.HealDivisor,
                        target: target,
                        offense: offense,
                        all: all,
                        splash: splash,
                        single: single,
                        self: self,
                        targetMultiplier: all ? (offense ? 3 : 2) : splash ? (offense ? 2 : 1.5) : single ? (offense ? 1 : 1.25) : self ? 1 : 0,
                        flurry: !!flurryMatch,
                        flurryCount: flurryCount,
                        flurryHitPercent: flurryHitPercent,
                        flurryHitMultiplier: flurryHitMultiplier,
                    };
                });
            }
        }
        bh.PlayerBattleCard = PlayerBattleCard;
    })(bh || (bh = {})),
    (function (bh) {
        class PlayerBoosterCard {
            constructor(guid, count = 0) {
                (this.count = count), (this.type = "BoosterCard"), (this._ = bh.data.BoosterCardRepo.find(guid));
            }
            get challenge() {
                return this._.challenge;
            }
            get elementType() {
                return this._.elementType;
            }
            get guid() {
                return this._.guid;
            }
            get name() {
                return this._.name;
            }
            get rarityType() {
                return this._.rarityType;
            }
            get rowHtml() {
                return `<div class="${bh.ElementType[this.elementType]}" data-element-type="${this.elementType}" data-type="${this.type}" data-rarity-type="${this.rarityType}">${bh.getImg20("misc", "Boosters")} ${
                    bh.RarityType[this.rarityType][0]
                }${this.challenge ? "*" : ""} ${this.name} <span class="badge pull-right">${bh.utils.formatNumber(this.count)}</span></div>`;
            }
            static rowHtml(count) {
                return `<div data-hud="true">${bh.getImg20("misc", "Boosters")} Boosters <span class="badge pull-right">${bh.utils.formatNumber(count)}</span></div>`;
            }
        }
        bh.PlayerBoosterCard = PlayerBoosterCard;
    })(bh || (bh = {})),
    (function (bh) {
        function getGoldCostForLevel(level) {
            if (1 == level) return 0;
            let delta = -50,
                gold = 950;
            for (let i = 2; i < level + 1; i++) (gold += delta), (delta += 200);
            return gold;
        }
        function getGoldCostForLevelRange(from, to) {
            let count = 0;
            for (let i = from, l = to; i < l; i++) count += getGoldCostForLevel(i + 1);
            return count;
        }
        function getAbilityLevel(playerHero, abilityType) {
            let level = playerHero.archetype.abilityLevels ? playerHero.archetype.abilityLevels[playerHero.hero.abilities[abilityType].guid] : null;
            return isNaN(level) ? 0 : level + 1;
        }
        function getOpEffects(playerHero) {
            let effects = [];
            return (
                playerHero.deck.forEach((bc) => {
                    bc.opEffects.forEach((effect) => {
                        effects.includes(effect) || effects.push(effect);
                    }),
                        bc.opEffectCombos.forEach((combo) => {
                            effects.includes(combo) || effects.push(combo);
                        });
                }),
                effects
            );
        }
        class PlayerHero extends bh.Cacheable {
            constructor(player, archetype) {
                super(), (this.player = player), (this.archetype = archetype), (this.hero = bh.data.HeroRepo.find(archetype.id));
            }
            get abilities() {
                return this.hero.abilities;
            }
            get abilityLevels() {
                return this.archetype.abilityLevels;
            }
            get active() {
                return this.fromCache("active", () => new bh.PlayerHeroAbility(this, this.hero.active, getAbilityLevel(this, bh.AbilityType.Active)));
            }
            get guid() {
                return this.hero.guid;
            }
            get elementType() {
                return this.hero.elementType;
            }
            get klassType() {
                return this.hero.klassType;
            }
            get name() {
                return this.hero.name;
            }
            get passive() {
                return this.fromCache("passive", () => new bh.PlayerHeroAbility(this, this.hero.passive, getAbilityLevel(this, bh.AbilityType.Passive)));
            }
            get trait() {
                return this.fromCache("trait", () => new bh.PlayerHeroAbility(this, this.hero.trait, getAbilityLevel(this, bh.AbilityType.Trait)));
            }
            get battleCards() {
                return this.fromCache("battleCards", () => bh.Hero.filterCardsByHero(this.hero, this.player.battleCards));
            }
            get completionLevel() {
                return this.level + this.trait.level + this.active.level + this.passive.level;
            }
            get deck() {
                return this.fromCache("deck", () => this.player.sortAndReduceBattleCards(this.archetype.deck));
            }
            get deckPowerRating() {
                return this.fromCache("deckPowerRating", () => bh.PowerRating.rateDeck(this.deck, this));
            }
            get hasOP() {
                return this.fromCache("hasOP", () => null != this.deck.find((card) => card.isOP));
            }
            get opEffects() {
                return this.fromCache("opEffects", () => getOpEffects(this));
            }
            get hitPoints() {
                return this.fromCache("hitPoints", () => this.hero.getHitPoints(this.level));
            }
            get hitPointsPowerRating() {
                return this.fromCache("hitPointsPowerRating", () => bh.PowerRating.ratePlayerHeroHitPoints(this));
            }
            get isCapped() {
                return this.level == this.levelCap;
            }
            get isLocked() {
                return this.archetype.locked;
            }
            get isMaxed() {
                return this.level == bh.HeroRepo.MaxLevel;
            }
            get isMeat() {
                return this.isMaxed && this.active.isMaxed && this.passive.isMaxed && this.trait.isMaxed;
            }
            get level() {
                return this.archetype.level + 1;
            }
            get levelCap() {
                return bh.HeroRepo.getMaxLevel(this.player.fameLevel);
            }
            get maxMaxGoldNeeded() {
                return getGoldCostForLevelRange(this.level, bh.HeroRepo.MaxLevel);
            }
            get nextGoldNeeded() {
                return getGoldCostForLevel(this.level + 1);
            }
            get goldHtml() {
                let gold = this.player.gold || 0,
                    color = gold < this.maxMaxGoldNeeded ? "bg-danger" : "bg-success";
                return `<div>${bh.getImg("misc", "Coin")} Gold <span class="badge pull-right ${color}">${bh.utils.formatNumber(gold)} / ${bh.utils.formatNumber(this.maxMaxGoldNeeded || 0)}</span></div>`;
            }
            get playerHeroAbilities() {
                return [this.trait, this.active, this.passive];
            }
            get playerHeroGuid() {
                return `${this.player.guid}-${this.hero.guid}`;
            }
            get powerPercent() {
                return this.fromCache("powerPercent", () => {
                    let powerThresholds = this.hero.maxPowerThresholds,
                        powerRating = this.powerRating;
                    return Math.round((100 * powerRating) / powerThresholds[4]);
                });
            }
            get powerRating() {
                return this.fromCache("powerRating", () => Math.round(this.hitPointsPowerRating + this.trait.powerRating + this.active.powerRating + this.passive.powerRating + this.deckPowerRating));
            }
            static getMaxedPlayerHero(playerGuid, heroGuid) {
                return bh.Cacheable.fromCache(`PlayerHero.getMaxedPlayerHero.${playerGuid}.${heroGuid}`, () => {
                    let guildPlayer = {},
                        player = new bh.Player(guildPlayer),
                        archetype = bh.HeroRepo.getMaxedArchetype(playerGuid, heroGuid);
                    return new PlayerHero(player, archetype);
                });
            }
        }
        bh.PlayerHero = PlayerHero;
    })(bh || (bh = {})),
    (function (bh) {
        function getMaterialCostForTrait(level) {
            return level < 2
                ? 1
                : level < 10
                ? 2
                : level < 18
                ? 3
                : level < 25
                ? 4
                : level < 33
                ? 5
                : level < 41
                ? 6
                : level < 49
                ? 7
                : level < 56
                ? 8
                : level < 64
                ? 9
                : level < 72
                ? 10
                : level < 80
                ? 11
                : level < 87
                ? 12
                : level < 95
                ? 13
                : level < 103
                ? 14
                : 15;
        }
        function getGoldCostForTrait(level) {
            if (1 == level) return 1e3;
            let delta = 754,
                gold = 3e3;
            for (let i = 2; i < level; i++) (gold += delta), (delta += 8);
            return gold;
        }
        function getMaterialCostForActive(level) {
            return level < 2
                ? 1
                : level < 7
                ? 3
                : level < 13
                ? 4
                : level < 18
                ? 5
                : level < 23
                ? 6
                : level < 28
                ? 7
                : level < 33
                ? 8
                : level < 38
                ? 9
                : level < 43
                ? 10
                : level < 48
                ? 11
                : level < 53
                ? 12
                : level < 58
                ? 13
                : level < 63
                ? 14
                : level < 68
                ? 15
                : level < 73
                ? 16
                : level < 78
                ? 17
                : level < 83
                ? 18
                : level < 88
                ? 19
                : level < 93
                ? 20
                : 21;
        }
        function getGoldCostForActive(level) {
            if (1 == level) return 5e3;
            let delta = 510,
                gold = 3500;
            for (let i = 2; i < level; i++) (gold += delta), (delta += 20);
            return gold;
        }
        function getMaterialCostForPassive(level) {
            return level < 2
                ? 2
                : level < 6
                ? 4
                : level < 9
                ? 5
                : level < 12
                ? 6
                : level < 16
                ? 7
                : level < 19
                ? 8
                : level < 22
                ? 9
                : level < 26
                ? 10
                : level < 29
                ? 11
                : level < 32
                ? 12
                : level < 36
                ? 13
                : level < 39
                ? 14
                : level < 42
                ? 15
                : level < 46
                ? 16
                : level < 49
                ? 17
                : level < 52
                ? 18
                : level < 56
                ? 19
                : level < 59
                ? 20
                : level < 62
                ? 21
                : level < 66
                ? 22
                : level < 69
                ? 23
                : level < 72
                ? 24
                : level < 76
                ? 25
                : 26;
        }
        function getGoldCostForPassive(level) {
            if (1 == level) return 7e3;
            let delta = 1015,
                gold = 1e4;
            for (let i = 2; i < level; i++) (gold += delta), (delta += 30);
            return gold;
        }
        function getMaterialCountFor(abilityType, level) {
            switch (abilityType) {
                case bh.AbilityType.Trait:
                    return getMaterialCostForTrait(level);
                case bh.AbilityType.Active:
                    return getMaterialCostForActive(level);
                case bh.AbilityType.Passive:
                    return getMaterialCostForPassive(level);
            }
        }
        function getMaterialCountForRange(abilityType, from, to) {
            let count = 0;
            for (let i = from + 1, l = to + 1; i < l; i++) count += getMaterialCountFor(abilityType, i);
            return count;
        }
        function getGoldCostFor(abilityType, level) {
            switch (abilityType) {
                case bh.AbilityType.Trait:
                    return getGoldCostForTrait(level);
                case bh.AbilityType.Active:
                    return getGoldCostForActive(level);
                case bh.AbilityType.Passive:
                    return getGoldCostForPassive(level);
            }
        }
        function getGoldCostForRange(abilityType, from, to) {
            let count = 0;
            for (let i = from + 1, l = to + 1; i < l; i++) count += getGoldCostFor(abilityType, i);
            return count;
        }
        (bh.getMaterialCountFor = getMaterialCountFor), (bh.getMaterialCountForRange = getMaterialCountForRange), (bh.getGoldCostFor = getGoldCostFor), (bh.getGoldCostForRange = getGoldCostForRange);
        class PlayerHeroAbility {
            constructor(playerHero, heroAbility, level) {
                (this.playerHero = playerHero), (this.heroAbility = heroAbility), (this.level = level);
            }
            get _type() {
                if ("Jinx" == this.hero.name) {
                    if (this.type == bh.AbilityType.Active) return bh.AbilityType.Passive;
                    if (this.type == bh.AbilityType.Passive) return bh.AbilityType.Active;
                }
                return this.type;
            }
            get hero() {
                return this.heroAbility.hero;
            }
            get guid() {
                return this.heroAbility.guid;
            }
            get name() {
                return this.heroAbility.name;
            }
            get type() {
                return this.heroAbility.type;
            }
            get isLocked() {
                return !this.level;
            }
            get isCapped() {
                return this.level == this.levelCap;
            }
            get isMaxed() {
                return this.level == this.levelMax;
            }
            get levelCap() {
                return bh.HeroRepo.getAbilityLevelCap(this);
            }
            get levelMax() {
                return bh.HeroRepo.getAbilityLevelMax(this);
            }
            get value() {
                return 0;
            }
            get nextMaterialCount() {
                return getMaterialCountFor(this._type, this.level + 1);
            }
            get maxMaterialCount() {
                let type = this._type,
                    max = bh.HeroRepo.getAbilityMaxLevel(this.hero, this.heroAbility.type);
                return getMaterialCountForRange(type, this.level, max);
            }
            get nextGoldCost() {
                return getGoldCostFor(this._type, this.level + 1);
            }
            get maxGoldCost() {
                let max = bh.HeroRepo.getAbilityMaxLevel(this.hero, this.heroAbility.type);
                return getGoldCostForRange(this._type, this.level, max);
            }
            get img() {
                return bh.getImg("skills", this.playerHero.name + bh.AbilityType[this.type]);
            }
            get materialHtml() {
                let player = this.playerHero.player,
                    item =
                        this.type == bh.AbilityType.Trait
                            ? player.inventory.find((item) => item.isRune && item.name.startsWith(this.hero.name))
                            : player.inventory.find((item) => item.isCrystal && item.elementType == this.playerHero.elementType),
                    owned = item.count,
                    color = owned < this.maxMaterialCount ? "bg-danger" : "bg-success",
                    img;
                return `<div>${this.type == bh.AbilityType.Trait ? bh.getImg("runes", this.name.replace(/\W/g, "")) : bh.getImg("crystals", bh.ElementType[this.hero.elementType])} ${
                    item.name
                } <span class="badge pull-right ${color}">${bh.utils.formatNumber(owned)} / ${bh.utils.formatNumber(this.maxMaterialCount || 0)}</span></div>`;
            }
            get goldHtml() {
                let gold = this.playerHero.player.gold || 0,
                    color = gold < this.maxGoldCost ? "bg-danger" : "bg-success";
                return `<div>${bh.getImg("misc", "Coin")} Gold <span class="badge pull-right ${color}">${bh.utils.formatNumber(gold)} / ${bh.utils.formatNumber(this.maxGoldCost || 0)}</span></div>`;
            }
            get powerRating() {
                return bh.PowerRating.ratePlayerHeroAbility(this);
            }
            toRowHtml(needed, owned) {
                let badgeCss,
                    badgeHtml = "number" == typeof needed ? `<span class="badge pull-right ${needed && owned ? (owned < needed ? "bg-danger" : "bg-success") : ""}">${bh.utils.formatNumber(needed)}</span>` : "";
                return `<div>${this.img} ${this.playerHero.name} ${bh.AbilityType[this.type]} ${badgeHtml}</div>`;
            }
        }
        bh.PlayerHeroAbility = PlayerHeroAbility;
    })(bh || (bh = {})),
    (function (bh) {
        class PlayerInventoryItem extends bh.Cacheable {
            constructor(player, item, count = 0) {
                super(), (this.player = player), (this.item = item), (this.count = count);
            }
            get elementType() {
                return this.item.elementType;
            }
            get guid() {
                return this.item.guid;
            }
            get itemType() {
                return this.item.itemType;
            }
            get name() {
                return this.item.name;
            }
            get rarityType() {
                return this.item.rarityType;
            }
            get isCrystal() {
                return PlayerInventoryItem.isCrystal(this);
            }
            get isEvoJar() {
                return PlayerInventoryItem.isEvoJar(this);
            }
            get isSandsOfTime() {
                return PlayerInventoryItem.isSandsOfTime(this);
            }
            get isRune() {
                return PlayerInventoryItem.isRune(this);
            }
            get needed() {
                return this.fromCache("needed", () => {
                    let needed = 0;
                    if (this.isRune) {
                        let heroName = (this.name || "").split("'")[0];
                        this.player.filterHeroes(heroName).forEach((playerHero) => (needed += playerHero.trait.maxMaterialCount || 0)),
                            this.player.filterActiveBattleCards(heroName, "Legendary").forEach((battleCard) => (needed += 60 * battleCard.count));
                    } else if (this.isCrystal)
                        this.player.filterHeroes(bh.ElementType[this.elementType]).forEach((playerHero) => (needed += (playerHero.active.maxMaterialCount || 0) + (playerHero.passive.maxMaterialCount || 0))),
                            this.player.filterActiveBattleCards(bh.ElementType[this.elementType], "Legendary").forEach((battleCard) => (needed += 60 * battleCard.count));
                    else if (this.isSandsOfTime) this.player.activeBattleCards.forEach((playerBattleCard) => (needed += playerBattleCard.maxMaxSotNeeded));
                    else {
                        let activeRecipes, filtered;
                        this.player.activeRecipes.filter((recipe) => !!recipe.getItem(this)).forEach((recipe) => (needed += recipe.getMaxNeeded(this)));
                    }
                    return needed;
                });
            }
            get rowHtml() {
                return this.fromCache("rowHtml", () => {
                    let folder = bh.ItemType[this.itemType].toLowerCase() + "s",
                        name = this.isEvoJar ? this.name.replace(/\W/g, "") : this.isCrystal ? this.name.split(/ /)[0] : bh.data.HeroRepo.find(this.name.split("'")[0])?.abilities[0].name.replace(/\W/g, ""),
                        image = bh.getImg20(folder, name),
                        needed = this.needed,
                        ofContent = needed ? ` / ${bh.utils.formatNumber(needed)}` : "",
                        color,
                        badge = `<span class="badge pull-right ${needed ? (this.count < needed ? "bg-danger" : "bg-success") : ""}">${bh.utils.formatNumber(this.count)}${ofContent}</span>`,
                        children = "";
                    if (needed)
                        if (this.isCrystal)
                            this.player.filterHeroes(bh.ElementType[this.elementType]).forEach((playerHero) => {
                                let active = playerHero.active,
                                    maxNeededActive,
                                    passive = playerHero.passive,
                                    maxNeededPassive;
                                (maxNeededActive = active.maxMaterialCount) && (children += active.toRowHtml(maxNeededActive, this.count)),
                                    (maxNeededPassive = passive.maxMaterialCount) && (children += passive.toRowHtml(maxNeededPassive, this.count));
                            }),
                                this.player.filterActiveBattleCards(bh.ElementType[this.elementType], "Legendary").forEach((battleCard) => {
                                    let maxNeeded = battleCard.count * bh.data.calcMaxCrystalsNeeded(battleCard.playerCard, battleCard.evoLevel);
                                    children += battleCard.toRowHtml(maxNeeded, this.count);
                                });
                        else if (this.isRune) {
                            let heroName = this.name.split("'")[0];
                            this.player.filterHeroes(heroName).forEach((playerHero) => {
                                let trait = playerHero.trait,
                                    maxNeeded;
                                (maxNeeded = trait.maxMaterialCount) && (children += trait.toRowHtml(maxNeeded, this.count));
                            }),
                                this.player.filterActiveBattleCards(heroName, "Legendary").forEach((battleCard) => {
                                    let maxNeeded = battleCard.count * bh.data.calcMaxRunesNeeded(battleCard.playerCard, battleCard.evoLevel);
                                    children += battleCard.toRowHtml(maxNeeded, this.count);
                                });
                        } else if (this.isSandsOfTime) {
                            let dungeons = bh.data.DungeonRepo.getDropRates(this.name).map(
                                (dropRate) => `<div>${dropRate.dungeon.name}<span class="badge pull-right">${Math.round(1e3 * dropRate.dropRate.averagePerKey) / 10}% / key</span></div>`
                            );
                            children += renderExpandable(this.guid + "-dungeons", `Dungeon Drops (${dungeons.length})`, dungeons.join(""));
                            let cards = this.player.activeBattleCards.map((playerBattleCard) => playerBattleCard.toRowHtml(playerBattleCard.maxMaxSotNeeded, this.count, !1));
                            children += renderExpandable(this.guid + "-cards", `Battle Cards (${cards.length})`, cards.join(""));
                        } else {
                            let dungeons = bh.data.DungeonRepo.getDropRates(this.name).map(
                                (dropRate) => `<div>${dropRate.dungeon.name}<span class="badge pull-right">${Math.round(1e3 * dropRate.dropRate.averagePerKey) / 10}% / key</span></div>`
                            );
                            children += renderExpandable(this.guid + "-dungeons", `Dungeon Drops (${dungeons.length})`, dungeons.join(""));
                            let activeRecipes,
                                filtered,
                                cards = this.player.activeRecipes
                                    .filter((recipe) => {
                                        let recipeItem = recipe.getItem(this);
                                        return recipeItem && 0 != recipeItem.max;
                                    })
                                    .map((recipe) => recipe.card.toRowHtml(recipe.getMaxNeeded(this), this.count, !1));
                            children += renderExpandable(this.guid + "-cards", `Battle Cards (${cards.length})`, cards.join(""));
                        }
                    return `<div data-element-type="${this.elementType}" data-rarity-type="${this.rarityType}" data-item-type="${this.itemType}" data-hud="${this.isSandsOfTime}">${renderExpandable(
                        this.guid,
                        `${image} ${this.name} ${badge}`,
                        children
                    )}</div>`;
                });
            }
            static isCrystal(item) {
                return item && item.itemType === bh.ItemType.Crystal;
            }
            static isEvoJar(item) {
                return item && item.itemType === bh.ItemType.EvoJar;
            }
            static isSandsOfTime(item) {
                return item && "Sands of Time" === item.name;
            }
            static isRune(item) {
                return item && item.itemType === bh.ItemType.Rune;
            }
            static toRowHtml(item, count, needed) {
                let folder = bh.ItemType[item.itemType].toLowerCase() + "s",
                    name = PlayerInventoryItem.isEvoJar(item)
                        ? item.name.replace(/\W/g, "")
                        : PlayerInventoryItem.isCrystal(item)
                        ? item.name.split(/ /)[0]
                        : bh.data.HeroRepo.find(item.name.split("'")[0])?.abilities[0].name.replace(/\W/g, ""),
                    image = bh.getImg20(folder, name),
                    color,
                    badge = `<span class="badge pull-right ${count < needed ? "bg-danger" : "bg-success"}">${bh.utils.formatNumber(count)} / ${bh.utils.formatNumber(needed)}</span>`;
                return `<div>${image} ${item.name} ${badge}</div>`;
            }
        }
        function renderExpandable(guid, text, children, isMe = true) {
            if (!children) return `<div>${text}</div>`;
            let expander, expandable;
            var icon = isMe ? `${`<button class="bs-btn bs-btn-link bs-btn-xs jai-hud-button" type="button" data-action="toggle-child" data-guid="${guid}">[+]</button>`}` : ``;
            var scr = `${`<div class="jai-hud-child-scroller" data-parent-guid="${guid}">${children}</div>`}`;
            return `<div>${text} ` + icon + ` </div>` + scr;
        }
        (bh.PlayerInventoryItem = PlayerInventoryItem), (bh.renderExpandable = renderExpandable);
    })(bh || (bh = {})),
    (function (bh) {
        class PlayerWildCard extends bh.Cacheable {
            constructor(player, guid) {
                super(), (this.player = player), (this.type = "WildCard"), (this._ = bh.data.WildCardRepo.find(guid));
            }
            get count() {
                return (this.player._pp && this.player._pp.wildcards[this.guid]) || 0;
            }
            get guid() {
                return this._.guid;
            }
            get html() {
                let needed = this.needed,
                    ofContent = needed ? ` / ${bh.utils.formatNumber(needed)}` : "",
                    css,
                    badge = `<span class="badge pull-right ${needed ? (this.count < needed ? "bg-danger" : "bg-success") : ""}">${this.count}${ofContent}</span>`;
                return `${bh.getImg("cardtypes", "WildCard")} ${this.name} WC ${badge}`;
            }
            get name() {
                return this._.name;
            }
            get needed() {
                return this.fromCache("needed", () => {
                    let needed = 0;
                    return this.player.filterActiveBattleCards(bh.RarityType[this.rarityType]).forEach((playerBattleCard) => (needed += playerBattleCard.maxWildCardsNeeded)), needed;
                });
            }
            get rarityType() {
                return bh.RarityType[this._.name.replace(/ /g, "")];
            }
            get rowHtml() {
                let html = this.html, expander = "", children = "";
                //console.log(this.player.isMe);
                //console.log(this.player.htmlFriendlyName);
                return (this.needed && ((expander = `<button class="bs-btn bs-btn-link bs-btn-xs jai-hud-button" type="button" data-action="toggle-child" data-guid="${this.guid}">[+]</button>`),
                        (children = `<div class="jai-hud-child-scroller" data-parent-guid="${this.guid}">`),
                        this.player.filterActiveBattleCards(bh.RarityType[this.rarityType]).forEach((playerBattleCard) => (children += playerBattleCard.toRowHtml(playerBattleCard.maxWildCardsNeeded, this.count))),
                        (children += "</div>")),
                    `<div data-type="${this.type}" data-rarity-type="${this.rarityType}"><div>${html} ${expander}</div>${children}</div>`
                );
            }
            static toRowHtml(wc, count, needed) {
                let image = bh.getImg20("cardtypes", "WildCard"),
                    color,
                    badge = `<span class="badge pull-right ${count < needed ? "bg-danger" : "bg-success"}">${bh.utils.formatNumber(count)} / ${bh.utils.formatNumber(needed)}</span>`;
                return `<div>${image} ${wc.name} WC ${badge}</div>`;
            }
        }
        bh.PlayerWildCard = PlayerWildCard;
    })(bh || (bh = {})),
    (function (bh) {
        let RarityEvolutions = { Common: 1, Uncommon: 2, Rare: 3, SuperRare: 4, Legendary: 5 },
            RarityLevels = { Common: 10, Uncommon: 20, Rare: 35, SuperRare: 50, Legendary: 50 },
            MinMaxType;
        !(function (MinMaxType) {
            (MinMaxType[(MinMaxType.Min = 0)] = "Min"), (MinMaxType[(MinMaxType.Max = 1)] = "Max");
        })((MinMaxType = bh.MinMaxType || (bh.MinMaxType = {})));
        class PowerRating {
            static sortCardsByPowerRating(cards = bh.data.BattleCardRepo.all) {
                return cards.sort((a, b) => {
                    let aPower = this.rateBattleCard(a, MinMaxType.Max, null) || 0,
                        bPower = this.rateBattleCard(b, MinMaxType.Max, null) || 0;
                    return aPower > bPower ? -1 : aPower < bPower ? 1 : 0;
                });
            }
            static rateMaxedHero(hero, maxRarity = bh.RarityType.Legendary) {
                return bh.Cacheable.fromCache(`PowerRating.rateMaxedHero.${hero.name}.${maxRarity}`, () => {
                    let abilities, maxRarityMultiplier;
                    return ("Jinx" == hero.name ? 45 : 55) * ((20 * (maxRarity + 1)) / 100) + PowerRating.rateMaxedDeck(hero, maxRarity);
                });
            }
            static getMaxedDeck(hero, maxRarity = bh.RarityType.Legendary, duplicates = !0) {
                return bh.Cacheable.fromCache(`PowerRating.getMaxedDeck.${hero.name}.${maxRarity}.${duplicates}`, () => {
                    let maxedHero = bh.PlayerHero.getMaxedPlayerHero(null, hero.guid),
                        heroCards,
                        ratedCards,
                        sortedCards = bh.Hero.filterCardsByHero(hero, bh.data.BattleCardRepo.all)
                            .filter((c) => c.rarityType <= maxRarity)
                            .map((card) => ({ card: card, powerRating: PowerRating.rateBattleCard(card, MinMaxType.Max, maxedHero) }))
                            .sort((a, b) => (a.powerRating == b.powerRating ? 0 : a.powerRating < b.powerRating ? 1 : -1)),
                        topCards = [],
                        cardCount = duplicates ? 4 : 8;
                    return (
                        sortedCards.forEach((card) => {
                            topCards.length < cardCount && !topCards.find((c) => c.card.name == card.card.name) && topCards.push(card);
                        }),
                        topCards
                    );
                });
            }
            static rateMaxedDeck(hero, maxRarity = bh.RarityType.Legendary, duplicates = !0) {
                return bh.Cacheable.fromCache(`PowerRating.rateMaxedDeck.${hero.name}.${maxRarity}.${duplicates}`, () =>
                    PowerRating.getMaxedDeck(hero, maxRarity, duplicates).reduce((score, card) => score + card.powerRating * (duplicates ? 2 : 1), 0)
                );
            }
            static rateDeck(deck, hero) {
                return deck.reduce((score, pbc) => score + PowerRating.ratePlayerCard(pbc.playerCard, hero) * pbc.count, 0);
            }
            static rateBattleCard(battleCard, minMax, hero) {
                let key = bh.RarityType[battleCard.rarityType],
                    evo = minMax == MinMaxType.Max ? RarityEvolutions[key] : 0,
                    level = minMax == MinMaxType.Max ? RarityLevels[key] : 0;
                return PowerRating.ratePlayerCard({ configId: battleCard.guid, evolutionLevel: evo, level: level - 1 }, hero);
            }
            static createBattleCardRatingMatrix() {
                return bh.data.BattleCardRepo.all.map((battleCard) => {
                    let playerHero = null;
                    if (battleCard.elementType != bh.ElementType.Neutral) {
                        let hero = bh.data.HeroRepo.filterByElement(battleCard.elementType).find((hero) => hero.klassType == battleCard.klassType);
                        playerHero = bh.PlayerHero.getMaxedPlayerHero(null, hero.guid);
                    }
                    return (
                        `${battleCard.name}\t${bh.RarityType[battleCard.rarityType]}\t` +
                        [bh.RarityType.Common, bh.RarityType.Uncommon, bh.RarityType.Rare, bh.RarityType.SuperRare, bh.RarityType.Legendary]
                            .map((rarityType) => {
                                if (rarityType > battleCard.rarityType) return "";
                                let key = bh.RarityType[rarityType],
                                    evo = RarityEvolutions[key],
                                    level = RarityLevels[key],
                                    pbc,
                                    op = new bh.PlayerBattleCard({ configId: battleCard.guid, evolutionLevel: evo, level: level - 1 }).isOP;
                                return PowerRating.ratePlayerCard({ configId: battleCard.guid, evolutionLevel: evo, level: level - 1 }, playerHero) + (op ? "!" : "");
                            })
                            .join("\t")
                            .replace(/NaN/g, "")
                    );
                });
            }
            static rateAndSort(cards, minMax = MinMaxType.Max, hero) {
                let rated = cards.map((card) => ({ card: card, powerRating: PowerRating.rateBattleCard(card, minMax, hero) }));
                return rated.sort((a, b) => b.powerRating - a.powerRating), rated;
            }
            static ratePlayerCard(playerCard, hero) {
                return playerCard
                    ? bh.Cacheable.fromCache(`PowerRating.ratePlayerCard.${(hero && hero.name) || ""}.${playerCard.configId}.${playerCard.evolutionLevel}.${playerCard.level}`, () => {
                          let card = playerCard && bh.data.BattleCardRepo.find(playerCard.configId);
                          if (!card) return 0;
                          let evoLevel = playerCard.evolutionLevel,
                              level = playerCard.level,
                              targets = (card && card.typesTargets.map((typeTarget) => bh.PlayerBattleCard.parseTarget(typeTarget))) || [],
                              gameEffects = bh.GameEffect.parseAll(playerCard),
                              rating = 0;
                          return (
                              targets.forEach((target, typeIndex) => (rating += rateCardTargetValue(card, typeIndex, evoLevel, level, hero) / target.typeDivisor)),
                              gameEffects.forEach((gameEffect) => (rating += gameEffect.powerRating)),
                              (rating /= card.turns),
                              Math.round(100 * rating)
                          );
                      })
                    : 0;
            }
            static ratePlayerHeroAbility(playerHeroAbility) {
                return bh.Cacheable.fromCache(`PowerRating.ratePlayerHeroAbility.${playerHeroAbility.hero.name}.${playerHeroAbility.heroAbility.name}.${playerHeroAbility.level}`, () => {
                    if ("Jinx" == playerHeroAbility.hero.name && playerHeroAbility.heroAbility.type == bh.AbilityType.Passive) return 0;
                    let mult;
                    return ((playerHeroAbility.type == bh.AbilityType.Trait ? 2 : playerHeroAbility.type == bh.AbilityType.Active ? 1.5 : 1) * Math.round((1e3 * playerHeroAbility.level) / playerHeroAbility.levelMax)) / 100;
                });
            }
            static ratePlayerHeroHitPoints(playerHero) {
                return bh.Cacheable.fromCache(`PowerRating.ratePlayerHeroAbility.${playerHero.name}.HP.${playerHero.level}`, () => {
                    let maxHeroLevel = bh.HeroRepo.MaxLevel,
                        maxHP = bh.data.HeroRepo.all
                            .map((h) => [bh.Hero.getHitPoints(h, maxHeroLevel), h])
                            .sort()
                            .pop()[0],
                        heroMultiplier = bh.Hero.getHitPoints(playerHero.hero, maxHeroLevel) / maxHP,
                        levelMultiplier = playerHero.level / maxHeroLevel;
                    return Math.round(1e3 * heroMultiplier * levelMultiplier) / 100;
                });
            }
        }
        function rateCardTargetValue(card, typeIndex, evo, level, hero) {
            let baseValue = bh.BattleCardRepo.calculateValue({ configId: card.guid, evolutionLevel: evo, level: level }),
                perkMultiplier = bh.BattleCardRepo.getPerk(card, evo) / 100,
                regenMultiplier = (bh.GameEffect.parse(card.effects.find((e) => "Regen" == e)) || { turns: 1 }).turns,
                critMultiplier = card.perks.includes("Critical") ? 1.5 * perkMultiplier : 1,
                target = bh.PlayerBattleCard.parseTarget(card.typesTargets[typeIndex]),
                value = Math.round(baseValue * critMultiplier * target.targetMultiplier * regenMultiplier);
            return (
                !hero ||
                    hero.isLocked ||
                    hero.passive.isLocked ||
                    ("Shield" == target.type && "Gilda" == hero.name && (value += bh.HeroRepo.getPassiveValue(hero.hero, hero.passive.level)),
                    "Damage" == target.type && 1 == card.turns && "Hawkeye" == hero.name && (value += (value * bh.HeroRepo.getPassiveValue(hero.hero, hero.passive.level)) / 100),
                    "Heal" == target.type && "Logan" == hero.name && (value += bh.HeroRepo.getPassiveValue(hero.hero, hero.passive.level)),
                    ["Heal", "Shield"].includes(target.type) && "Monty" == hero.name && (value += bh.HeroRepo.getPassiveValue(hero.hero, hero.passive.level))),
                target.flurry && (value = (value / target.flurryCount) * target.flurryHitMultiplier * target.flurryCount),
                value || console.log(card.name, [card, typeIndex, evo, level, baseValue, perkMultiplier, critMultiplier, target, value]),
                value
            );
        }
        bh.PowerRating = PowerRating;
    })(bh || (bh = {})),
    (function (bh) {
        class Recipe extends bh.Cacheable {
            constructor(card, partial = !1) {
                super(), (this.card = card), (this.evos = []);
                let matItems = ((card && card.mats) || [])
                    .map((mat) => bh.data.ItemRepo.find(mat.trim()))
                    .filter((item) => !!item)
                    .sort(bh.utils.sort.byRarity);
                [0, 1, 2, 3, 4]
                    .slice(0, card.rarityType + 1)
                    .slice(partial ? card.evo : 0)
                    .forEach((evoFrom) => {
                        let sands = bh.ItemRepo.sandsOfTime;
                        sands ? this.addItem(evoFrom, bh.data.getMinSotNeeded(card.rarityType, evoFrom), bh.data.getMaxSotNeeded(card.rarityType, evoFrom), sands.name) : console.warn("No SandsOfTime!?", evoFrom),
                            matItems.forEach((item) => {
                                this.addItem(evoFrom, 0, bh.data.getMaxMatNeeded(card.rarityType, evoFrom, item.rarityType), item.name);
                            });
                    });
            }
            get lower() {
                return this.card.lower;
            }
            get name() {
                return this.card.name;
            }
            get rarityType() {
                return this.card.rarityType;
            }
            addItem(evoFrom, min, max, itemName) {
                let evo = this.evos[evoFrom] || (this.evos[evoFrom] = { evoFrom: evoFrom, evoTo: evoFrom + 1, items: [] }),
                    evoItem = { item: bh.data.ItemRepo.find(itemName), min: min, max: max };
                evo.items.push(evoItem);
            }
            get common() {
                return this.fromCache("common", () => {
                    let recipeItem = this.all.find((item) => item.item.rarityType == bh.RarityType.Common);
                    return recipeItem && recipeItem.item;
                });
            }
            get uncommon() {
                return this.fromCache("uncommon", () => {
                    let recipeItem = this.all.find((item) => item.item.rarityType == bh.RarityType.Uncommon && "Sands of Time" != item.item.name);
                    return recipeItem && recipeItem.item;
                });
            }
            get rare() {
                return this.fromCache("rare", () => {
                    let recipeItem = this.all.find((item) => item.item.rarityType == bh.RarityType.Rare);
                    return recipeItem && recipeItem.item;
                });
            }
            get superRare() {
                return this.fromCache("superRare", () => {
                    let recipeItem = this.all.find((item) => item.item.rarityType == bh.RarityType.SuperRare);
                    return recipeItem && recipeItem.item;
                });
            }
            get inventoryItems() {
                return [this.common, this.uncommon, this.rare, this.superRare];
            }
            get all() {
                return this.fromCache("recipeItems", () => {
                    let items = [];
                    return (
                        this.evos.forEach((evo) => {
                            evo.items.forEach((recipeItem) => {
                                let item = items.find((item) => item.item == recipeItem.item);
                                item || items.push((item = { item: recipeItem.item, min: 0, max: 0 })), (item.min += recipeItem.min), (item.max += recipeItem.max);
                            });
                        }),
                        items
                    );
                });
            }
            getItem(item) {
                return this.all.find((recipeItem) => recipeItem.item.name == item.name);
            }
            getMaxNeeded(item) {
                let recipeItem = this.getItem(item),
                    max,
                    multiplier;
                return (recipeItem && recipeItem.max) * (this.card instanceof bh.PlayerBattleCard ? this.card.count : 1);
            }
        }
        bh.Recipe = Recipe;
    })(bh || (bh = {})),
    (function (bh) {
        let AbilityType, ElementType, ItemType, KlassType, PositionType, RarityType;
        !(function (AbilityType) {
            (AbilityType[(AbilityType.Trait = 0)] = "Trait"), (AbilityType[(AbilityType.Active = 1)] = "Active"), (AbilityType[(AbilityType.Passive = 2)] = "Passive");
        })((AbilityType = bh.AbilityType || (bh.AbilityType = {}))),
            (function (ElementType) {
                (ElementType[(ElementType.Fire = 0)] = "Fire"),
                    (ElementType[(ElementType.Earth = 1)] = "Earth"),
                    (ElementType[(ElementType.Air = 2)] = "Air"),
                    (ElementType[(ElementType.Spirit = 3)] = "Spirit"),
                    (ElementType[(ElementType.Water = 4)] = "Water"),
                    (ElementType[(ElementType.Neutral = 5)] = "Neutral");
            })((ElementType = bh.ElementType || (bh.ElementType = {}))),
            (function (ItemType) {
                (ItemType[(ItemType.EvoJar = 0)] = "EvoJar"), (ItemType[(ItemType.Crystal = 1)] = "Crystal"), (ItemType[(ItemType.Rune = 2)] = "Rune");
            })((ItemType = bh.ItemType || (bh.ItemType = {}))),
            (function (KlassType) {
                (KlassType[(KlassType.Magic = 0)] = "Magic"), (KlassType[(KlassType.Might = 1)] = "Might"), (KlassType[(KlassType.Skill = 2)] = "Skill");
            })((KlassType = bh.KlassType || (bh.KlassType = {}))),
            (function (PositionType) {
                (PositionType[(PositionType.Member = 0)] = "Member"), (PositionType[(PositionType.Elder = 1)] = "Elder"), (PositionType[(PositionType.CoLeader = 2)] = "CoLeader"), (PositionType[(PositionType.Leader = 3)] = "Leader");
            })((PositionType = bh.PositionType || (bh.PositionType = {}))),
            (function (RarityType) {
                (RarityType[(RarityType.Common = 0)] = "Common"),
                    (RarityType[(RarityType.Uncommon = 1)] = "Uncommon"),
                    (RarityType[(RarityType.Rare = 2)] = "Rare"),
                    (RarityType[(RarityType.SuperRare = 3)] = "SuperRare"),
                    (RarityType[(RarityType.Legendary = 4)] = "Legendary");
            })((RarityType = bh.RarityType || (bh.RarityType = {})));
    })(bh || (bh = {})),
    (function (bh) {
        bh.TSV = {};
        class Repo {
            constructor(id = "", gid = 0, useCache = !1) {
                (this.id = id), (this.gid = gid), (this.useCache = useCache), Repo.AllRepos.push(this);
            }
            init() {
                return (
                    this._init ||
                        (this._init = new Promise((resolvefn) => {
                            //let useCache = !0 === bh.USE_CACHE_OVERRIDE || this.useCache;
                            let useCache = true;
                            let cached = (bh.TSV || {})[String(this.gid || this.id)];
                            cached && useCache
                                ? (console.log(`not fetching ${this.constructor.name} from google`), this.resolveTsv(cached, resolvefn))
                                : this.id && this.gid && "number" == typeof this.gid
                                ? (console.log(`fetching ${this.constructor.name} from google`),
                                  Repo.fetchTsv(this.id, this.gid).then(
                                      (tsv) => {
                                          tsv
                                              ? this.resolveTsv(tsv, resolvefn)
                                              : Repo.fetchTsv(this.id, this.gid).then(
                                                    (tsv) => this.resolveTsv(tsv, resolvefn),
                                                    () => this.resolveTsv(cached, resolvefn)
                                                );
                                      },
                                      () => {
                                          Repo.fetchTsv(this.id, this.gid).then(
                                              (tsv) => this.resolveTsv(tsv, resolvefn),
                                              () => this.resolveTsv(cached, resolvefn)
                                          );
                                      }
                                  ))
                                : (console.log(`doing nothing with ${this.constructor.name}`), resolvefn((this.data = [])));
                        })),
                    this._init
                );
            }
            resolveTsv(tsv, resolvefn) {
                if (String(tsv).includes("500 Internal Server Error")) {
                    let html = tsv;
                    bh.$(() => {
                        bh.$("body").append(`<textarea>${html.replace(/\</g, "&lt;").replace(/\>/g, "&gt;")}</textarea>`);
                    }),
                        (tsv = "");
                }
                let parsed = this.parseTsv(tsv || "");
                parsed instanceof Promise
                    ? parsed.then(
                          (data) => resolvefn((this.data = data)),
                          () => resolvefn((this.data = []))
                      )
                    : resolvefn(parsed);
            }
            parseTsv(tsv) {
                return (this.data = Repo.mapTsv(tsv));
            }
            get all() {
                return this.data.slice();
            }
            get allSortedByName() {
                return this.sortedByName || (this.sortedByName = this.all.sort(bh.utils.sort.byName)), this.sortedByName;
            }
            get length() {
                return this.data.length;
            }
            find(value) {
                if (!value) return null;
                let lower = value.toLowerCase();
                return this.data.find((t) => t.guid == value || t.name == value || t.lower == lower);
            }
            put(value) {
                let index = this.data.findIndex((t) => t.guid == value.guid);
                -1 < index ? (this.data[index] = value) : this.data.push(value);
            }
            static fetchTsv(idOrGid, gidOrUndefined) {
                let id = "number" == typeof gidOrUndefined ? idOrGid : null,
                    gid = "number" == typeof gidOrUndefined ? gidOrUndefined : idOrGid;
                return XmlHttpRequest.get(`https://docs.google.com/spreadsheets/d/${id}/pub?output=tsv&gid=${gid}`);
            }
            static mapTsv(raw) {
                let lines = raw.split(/\n/),
                    keys = lines
                        .shift()
                        .split(/\t/)
                        .map((s) => s.trim());
                return lines
                    .filter((line) => !!line.trim().length)
                    .map((line) => {
                        let values = line.split(/\t/).map((s) => s.trim()),
                            object = {};
                        return (
                            keys.forEach((key, index) => {
                                let value = values[index];
                                switch (key) {
                                    case "elementTypes":
                                    case "crystalElementTypes":
                                    case "boosterElementTypes":
                                        object[key] = value
                                            .split(",")
                                            .filter((s) => !!s)
                                            .map((s) => bh.ElementRepo.findType(s));
                                        break;
                                    case "element":
                                    case "elementType":
                                        object.elementType = bh.ElementRepo.findType(value);
                                        break;
                                    case "rarity":
                                    case "rarityType":
                                        object.rarityType = bh.RarityRepo.findType(value);
                                        break;
                                    case "klass":
                                    case "klassType":
                                        object.klassType = bh.KlassRepo.findType(value);
                                        break;
                                    case "itemType":
                                        object.itemType = bh.ItemRepo.findType(value);
                                        break;
                                    case "abilityType":
                                        object.abilityType = bh.AbilityRepo.findType(value);
                                        break;
                                    case "brag":
                                    case "packs":
                                        object[key] = bh.utils.parseBoolean(value);
                                        break;
                                    case "randomMats":
                                        object[key] = value.split(",").map((s) => +s);
                                        break;
                                    case "boosterRarities":
                                    case "minValues":
                                        object[key] = value.split("|").map((s) => s.split(",").map((s) => +s));
                                        break;
                                    case "maxValues":
                                        object[key] = value.split("|").map((s) => +s);
                                        break;
                                    case "typesTargets":
                                        object[key] = value.split("|").filter((s) => !!s);
                                        break;
                                    case "runeHeroes":
                                    case "effects":
                                    case "mats":
                                    case "perks":
                                        object[key] = value.split(",").filter((s) => !!s);
                                        break;
                                    case "keys":
                                    case "fame":
                                    case "gold":
                                    case "perkBase":
                                    case "turns":
                                    case "week":
                                        object[key] = +value;
                                        break;
                                    case "name":
                                        (object.lower = value.toLowerCase()), (object[key] = (value || "").trim());
                                        break;
                                    case "start":
                                        object[key] = new Date(value);
                                        break;
                                    default:
                                        object[key] = (value || "").trim();
                                }
                            }),
                            object
                        );
                    });
            }
            static async init() {
                for (let repo of Repo.AllRepos) await repo.init();
            }
        }
        (Repo.AllRepos = []), (bh.Repo = Repo);
    })(bh || (bh = {})),
    (function (bh) {
        class AbilityRepo {
            static get allTypes() {
                return [0, 1, 2];
            }
            static isAbility(ability) {
                return String(ability).replace(/ /g, "") in bh.AbilityType;
            }
            static findType(value) {
                return this.allTypes.find((abilityType) => value[0] == bh.AbilityType[abilityType][0]);
            }
        }
        bh.AbilityRepo = AbilityRepo;
    })(bh || (bh = {})),
    (function (bh) {
        class BattleCardRepo extends bh.Repo {
            static getPerk(card, evo) {
                return (card && Math.min(100, card.perkBase + BattleCardRepo.AddedPerkPerEvo * evo)) || 0;
            }
            static getMaxPerk(card) {
                return BattleCardRepo.getPerk(card, 1 + card.rarityType);
            }
            static calculateValue(playerCard, typeIndex = 0) {
                let card = bh.data.BattleCardRepo.find(playerCard.configId);
                if (!card) return 0;
                let min = card.minValues[typeIndex][playerCard.evolutionLevel],
                    deltaMin = card.minValues[typeIndex].slice().pop(),
                    deltaMax,
                    delta = (card.maxValues[typeIndex] - deltaMin) / (bh.BattleCardRepo.getLevelsForRarity(card.rarityType) - 1);
                return Math.floor(min + delta * playerCard.level);
            }
            static getLevelsForRarity(rarityType) {
                return [10, 20, 35, 50, 50][rarityType];
            }
            static isMaxLevel(rarity, level) {
                return level == BattleCardRepo.getLevelsForRarity(bh.RarityRepo.findType(rarity));
            }
            static getXpDeltaFromLevel(level) {
                return level ? 36 * (level - 1) + 100 : 0;
            }
            static getXpForLevel(level) {
                let xp = 0;
                for (let i = 1; i < level; i++) xp += BattleCardRepo.getXpDeltaFromLevel(i);
                return xp;
            }
            static getXpValue(card) {
                switch (card.rarityType) {
                    case bh.RarityType.Common:
                        return 400;
                    case bh.RarityType.Uncommon:
                        return 700;
                    case bh.RarityType.Rare:
                        return 1200;
                    case bh.RarityType.SuperRare:
                    case bh.RarityType.Legendary:
                    default:
                        return 0;
                }
            }
            static getMonthlyCard(monthIndex) {
                let month = bh.data.MonthlyRepo.all.find((m) => m.month == monthIndex + 1);
                return (month && bh.data.BattleCardRepo.find(month.card)) || null;
            }
        }
        (BattleCardRepo.AddedPerkPerEvo = 10), (bh.BattleCardRepo = BattleCardRepo);
    })(bh || (bh = {})),
    (function (bh) {
        class BoosterCardRepo extends bh.Repo {
            static getXpValue(card, match = !1) {
                let multiplier = match ? 1.5 : 1;
                switch (card.rarityType) {
                    case bh.RarityType.Common:
                        return 120 * multiplier;
                    case bh.RarityType.Uncommon:
                        return 220 * multiplier;
                    case bh.RarityType.Rare:
                        return 350 * multiplier;
                    case bh.RarityType.SuperRare:
                        return 700 * multiplier;
                    default:
                        return 0;
                }
            }
        }
        bh.BoosterCardRepo = BoosterCardRepo;
    })(bh || (bh = {})),
    (function (bh) {
        class DungeonRepo extends bh.Repo {
            parseTsv(tsv) {
                let data = bh.Repo.mapTsv(tsv);
                return (
                    data.forEach((dungeon) => {
                        bh.UuidUtils.isValid(dungeon.guid) ||
                            ((dungeon.guid = dungeon.lower.replace(/\W/g, "-")),
                            Array.isArray(dungeon.crystals) ||
                                (dungeon.crystals = String(dungeon.crystals)
                                    .split(",")
                                    .filter((c) => !!c)),
                            Array.isArray(dungeon.mats) ||
                                (dungeon.mats = String(dungeon.mats)
                                    .split(",")
                                    .filter((m) => !!m)),
                            Array.isArray(dungeon.runes) ||
                                (dungeon.runes = String(dungeon.runes)
                                    .split(",")
                                    .filter((r) => !!r)));
                    }),
                    (this.data = data.map((d) => new bh.Dungeon(d)))
                );
            }
            findDungeonFor(value) {
                return bh.Cacheable.fromCache("DungeonRepo.findDungeonFor." + value, () => this.all.filter((dungeon) => !!dungeon.findDrop(value)));
            }
            getDropRates(value) {
                return bh.Cacheable.fromCache("DungeonRepo.getDropRates." + value, () =>
                    this.all
                        .map((dungeon) => dungeon.findDrop(value))
                        .filter((drop) => !!drop)
                        .sort(sortDropRates)
                        .reverse()
                );
            }
        }
        function sortDropRates(a, b) {
            let aPerKey = a.dropRate.averagePerKey,
                bPerKey = b.dropRate.averagePerKey;
            if (aPerKey != bPerKey) return aPerKey < bPerKey ? -1 : 1;
            let aKeys = a.dungeon.keys,
                bKeys = b.dungeon.keys;
            if (aKeys != bKeys) return aKeys < bKeys ? 1 : -1;
            let aDiff = "Normal" == a.dungeon.difficulty ? 0 : "Elite" == a.dungeon.difficulty ? 1 : 2,
                bDiff = "Normal" == b.dungeon.difficulty ? 0 : "Elite" == b.dungeon.difficulty ? 1 : 2;
            return aDiff != bDiff ? (aDiff < bDiff ? 1 : -1) : 0;
        }
        bh.DungeonRepo = DungeonRepo;
    })(bh || (bh = {})),
    (function (bh) {
        class EffectRepo extends bh.Repo {
            parseTsv(tsv) {
                return (this.data = bh.Repo.mapTsv(tsv)), this.data.forEach((effect) => (effect.guid = effect.lower.replace(/\W/g, "-"))), this.data;
            }
            find(value) {
                let lower = value.toLowerCase();
                return this.data.find((t) => t.lower == lower || (t.alt || "").toLowerCase() == lower);
            }
            static mapEffects(card) {
                let effects = [];
                return (
                    card.effects.forEach((effect) => {
                        mapTargetOrEffectOrPerk(effect).forEach((item) => {
                            effects.includes(item) || effects.push(item);
                        });
                    }),
                    effects
                );
            }
            static mapPerks(card) {
                let perks = [];
                return (
                    card.perks.forEach((perk) => {
                        mapTargetOrEffectOrPerk(perk).forEach((item) => {
                            perks.includes(item) || perks.push(item);
                        });
                    }),
                    perks
                );
            }
            static mapTargets(card) {
                let targets = [];
                return (
                    card.typesTargets.forEach((target) => {
                        mapTargetOrEffectOrPerk(target).forEach((item) => {
                            targets.includes(item) || targets.push(item);
                        });
                    }),
                    targets
                );
            }
            static toScouterImage(effectName, index, style = "") {
                if (effectName.includes("-"))
                    return effectName
                        .split("-")
                        .map((e, i) => EffectRepo.toScouterImage(e, index + 2 * i - 1, "opacity:0.75;"))
                        .join("");
                let effect = bh.data.EffectRepo.find(effectName);
                return !effect || ["Self", "Single"].includes(effect.name) ? "" : bh.img(bh.getSrc("effects", effect.name.replace(/\W/g, "")), "icon-20", `${style};position:relative;left:-${5 * index}px`, effectName);
            }
            static toImage(effect, fn = bh.getImg20) {
                return ["Self", "Single"].includes(effect.name) ? "" : fn("effects", effect.name.replace(/\W/g, ""));
            }
            static toImageSrc(effect) {
                return ["Self", "Single"].includes(effect.name) ? "" : bh.getSrc("effects", effect.name.replace(/\W/g, ""));
            }
        }
        function mapTargetOrEffectOrPerk(item) {
            let gameEffect = bh.GameEffect.parse(item),
                effect = (gameEffect && bh.data.EffectRepo.find(gameEffect.effect)) || null,
                effects = effect ? [effect] : [];
            return (
                gameEffect &&
                    (gameEffect.raw.includes("All Allies") && effects.push(bh.data.EffectRepo.find("Multi-Target (Ally)")),
                    gameEffect.raw.includes("All Enemies") && effects.push(bh.data.EffectRepo.find("Multi-Target (Enemy)")),
                    gameEffect.raw.includes("Flurry") && effects.push(bh.data.EffectRepo.find("Flurry"))),
                effects
            );
        }
        bh.EffectRepo = EffectRepo;
    })(bh || (bh = {})),
    (function (bh) {
        class ElementRepo {
            static get allTypes() {
                return [0, 1, 2, 3, 4, 5];
            }
            static toImage(elementType, fn = bh.getImg20) {
                return elementType == bh.ElementType.Neutral ? "" : fn("elements", bh.ElementType[elementType]);
            }
            static toImageSrc(elementType) {
                return bh.getSrc("elements", bh.ElementType[elementType]);
            }
            static isElement(element) {
                return String(element) in bh.ElementType;
            }
            static findType(value) {
                let type = this.allTypes.find((elementType) => value[0] == bh.ElementType[elementType][0]);
                return null === type && console.log(value), type;
            }
        }
        bh.ElementRepo = ElementRepo;
    })(bh || (bh = {})),
    (function (bh) {
        class HeroRepo extends bh.Repo {
            parseTsv(tsv) {
                return new Promise((resolvefn) => {
                    let mapped = bh.Repo.mapTsv(tsv),
                        heroes = [];
                    for (; mapped.length; ) heroes.push(new bh.Hero([mapped.shift(), mapped.shift(), mapped.shift()]));
                    resolvefn((this.data = heroes));
                });
            }
            filterByElement(elementOrElementType) {
                return this.data.filter((hero) => hero.elementType === elementOrElementType || bh.ElementType[hero.elementType] === elementOrElementType);
            }
            get sorted() {
                return this._sorted || (this._sorted = this.data.slice().sort(bh.utils.sort.byElementThenKlass)), this._sorted;
            }
            sortBy(sort) {
                return sort ? this.data.slice().sort(sort) : this.sorted;
            }
            static toImageSrc(hero) {
                return bh.getSrc("heroes", hero.name);
            }
            static getMaxLevel(fame) {
                return 2 * fame;
            }
            static getMaxTrait(level) {
                return Math.max(level - 1, 0);
            }
            static getMaxActive(hero, level) {
                return "Jinx" == hero.name ? Math.max(level - 29, 0) : Math.max(level - 14, 0);
            }
            static getMaxPassive(hero, level) {
                return "Jinx" == hero.name ? Math.max(level - 14, 0) : Math.max(level - 29, 0);
            }
            static getPassiveValue(hero, passiveLevel) {
                if (!passiveLevel) return 0;
                if ("Hawkeye" == hero.name) return 10 + 1.25 * (passiveLevel - 1);
                if (passiveLevel == HeroRepo.getMaxPassive(hero, 90)) {
                    if ("Gilda" == hero.name) return 2820;
                    if ("Logan" == hero.name) return 3675;
                    if ("Monty" == hero.name) return 2030;
                    if ("Red" == hero.name) return 2365;
                    if ("Trix" == hero.name) return 1185;
                }
                if (passiveLevel == HeroRepo.getMaxPassive(hero, 100)) {
                    if ("Gilda" == hero.name) return 3510;
                    if ("Logan" == hero.name) return 4495;
                    if ("Monty" == hero.name) return 2505;
                    if ("Red" == hero.name) return 2890;
                    if ("Trix" == hero.name) return 1473;
                }
                return 0;
            }
            static getAbilityLevelCap(playerHeroAbility) {
                switch (playerHeroAbility.type) {
                    case bh.AbilityType.Active:
                        return HeroRepo.getMaxActive(playerHeroAbility.hero, playerHeroAbility.playerHero.level);
                    case bh.AbilityType.Passive:
                        return HeroRepo.getMaxPassive(playerHeroAbility.hero, playerHeroAbility.playerHero.level);
                    case bh.AbilityType.Trait:
                        return HeroRepo.getMaxTrait(playerHeroAbility.playerHero.level);
                }
            }
            static getAbilityLevelMax(playerHeroAbility) {
                switch (playerHeroAbility.type) {
                    case bh.AbilityType.Active:
                        return HeroRepo.getMaxActive(playerHeroAbility.hero, HeroRepo.MaxLevel);
                    case bh.AbilityType.Passive:
                        return HeroRepo.getMaxPassive(playerHeroAbility.hero, HeroRepo.MaxLevel);
                    case bh.AbilityType.Trait:
                        return HeroRepo.getMaxTrait(HeroRepo.MaxLevel);
                }
            }
            static get MaxHeroCount() {
                return bh.MaxHeroCount;
            }
            static get MaxFame() {
                return bh.MaxFameLevel;
            }
            static get MaxLevel() {
                return HeroRepo.getMaxLevel(HeroRepo.MaxFame);
            }
            static get MaxCompletionLevel() {
                let maxLevel = HeroRepo.MaxLevel,
                    hero = {};
                return maxLevel + HeroRepo.getMaxTrait(maxLevel) + HeroRepo.getMaxActive(hero, maxLevel) + HeroRepo.getMaxPassive(hero, maxLevel);
            }
            static getAbilityMaxLevel(hero, abilityType) {
                switch (abilityType) {
                    case bh.AbilityType.Active:
                        return HeroRepo.getMaxActive(hero, HeroRepo.MaxLevel);
                    case bh.AbilityType.Passive:
                        return HeroRepo.getMaxPassive(hero, HeroRepo.MaxLevel);
                    case bh.AbilityType.Trait:
                        return HeroRepo.getMaxTrait(HeroRepo.MaxLevel);
                }
            }
            static getLockedArchetype(playerGuid, heroGuid) {
                return { playerId: playerGuid, id: heroGuid, experience: 0, level: 0, version: 0, abilityLevels: {}, deck: [], locked: !0 };
            }
            static getMaxedArchetype(playerGuid, heroGuid) {
                let abilityLevels = {},
                    hero = bh.data.HeroRepo.find(heroGuid);
                return (
                    hero.abilities.forEach((ability) => (abilityLevels[ability.guid] = HeroRepo.getAbilityMaxLevel(hero, ability.type))),
                    { playerId: playerGuid, id: heroGuid, experience: 0, level: this.MaxLevel - 1, version: 0, abilityLevels: abilityLevels, deck: [], locked: !1 }
                );
            }
        }
        bh.HeroRepo = HeroRepo;
    })(bh || (bh = {})),
    (function (bh) {
        class ItemRepo extends bh.Repo {
            get evoJars() {
                return this.data.filter((item) => item.itemType === bh.ItemType.EvoJar);
            }
            get crystals() {
                return this.data.filter((item) => item.itemType === bh.ItemType.Crystal);
            }
            get runes() {
                return this.data.filter((item) => item.itemType === bh.ItemType.Rune);
            }
            static getValue(itemType, rarityType) {
                return itemType == bh.ItemType.Crystal ? 1e3 : itemType == bh.ItemType.Rune ? 2e3 : [300, 800, 1500, 3e3][rarityType];
            }
            static get sandsOfTime() {
                return bh.data.ItemRepo.find("Sands of Time");
            }
            static toImage(item, fn = bh.getImg20) {
                let folder, name;
                return fn(
                    bh.ItemType[item.itemType].toLowerCase() + "s",
                    item.itemType == bh.ItemType.EvoJar ? item.name.replace(/\W/g, "") : item.itemType == bh.ItemType.Crystal ? item.name.split(/ /)[0] : bh.data.HeroRepo.find(item.name.split("'")[0]).abilities[0].name.replace(/\W/g, "")
                );
            }
            static toImageSrc(item) {
                let itemType;
                if (!bh.ItemType[item.itemType]) return console.warn("Missing ItemType", item), "";
                let folder = bh.ItemType[item.itemType].toLowerCase() + "s",
                    name =
                        item.itemType == bh.ItemType.EvoJar
                            ? item.name.replace(/\W/g, "")
                            : item.itemType == bh.ItemType.Crystal
                            ? item.name.split(/ /)[0]
                            : bh.data.HeroRepo.find(item.name.split("'")[0]).abilities[0].name.replace(/\W/g, "");
                return bh.getSrc(folder, name);
            }
            static get allTypes() {
                return [0, 1, 2];
            }
            static findType(value) {
                return this.allTypes.find((itemType) => value[0] == bh.ItemType[itemType][0]);
            }
        }
        bh.ItemRepo = ItemRepo;
    })(bh || (bh = {})),
    (function (bh) {
        class KlassRepo {
            static get allTypes() {
                return [0, 1, 2];
            }
            static toImage(klassType, fn = bh.getImg20) {
                return fn("classes", bh.KlassType[klassType]);
            }
            static toImageSrc(klassType) {
                return bh.getSrc("classes", bh.KlassType[klassType]);
            }
            static findType(value) {
                return this.allTypes.find((klassType) => value.slice(0, 2) == bh.KlassType[klassType].slice(0, 2));
            }
        }
        bh.KlassRepo = KlassRepo;
    })(bh || (bh = {})),
    (function (bh) {
        class RarityRepo {
            static get allTypes() {
                return [0, 1, 2, 3, 4];
            }
            static isRarity(rarity) {
                return String(rarity).replace(/ /g, "") in bh.RarityType;
            }
            static findType(value) {
                return this.allTypes.find((rarityType) => value[0] == bh.RarityType[rarityType][0]);
            }
        }
        bh.RarityRepo = RarityRepo;
    })(bh || (bh = {})),
    (function (bh) {
        let data;
        (bh.Version = "0.0.0"),
            (bh.CurrentVersion = "0.0.0"),
            (bh.DataSheetID = "1zO_MZAW0cZEd9Ukto7F7KM9ggXx7wxC1SLrdXQRFBL8"),
            (bh.BattleCardRepoGID = 1013492615),
            (bh.BoosterCardRepoGID = 1070164839),
            (bh.DungeonRepoGID = 1980099142),
            (bh.EffectRepoGID = 1091073205),
            (bh.GuildsGID = 496437953),
            (bh.HeroRepoGID = 1755919442),
            (bh.ItemRepoGID = 1250310062),
            (bh.MonthlyRepoGID = 705026993),
            (bh.WildCardRepoGID = 2106503523),
            (bh.GuildWarGID = 1398180425),
            (bh.USE_CACHE = !0),
            (bh.NO_CACHE = !1),
            (bh.MaxHeroCount = 13),
            (bh.MaxFameLevel = 50),
            (bh.AttackDivisor = 750),
            (bh.ShieldDivisor = 1500),
            (bh.HealDivisor = 1500),
            (function (data) {
                function getWar(week) {
                    return data.GuildWarRepo.all.find((gw) => gw.week === week);
                }
                function getActiveGuildWar() {
                    let now = new Date().getTime();
                    return data.GuildWarRepo.all.find((gw) => {
                        let start = gw.start.getTime(),
                            end;
                        return start < now && now < start + 3456e5;
                    });
                }
                function getNextGuildWar(current = getActiveGuildWar()) {
                    if (current) return data.GuildWarRepo.all.find((gw) => gw.week == current.week + 1);
                    let now = new Date().getTime();
                    return data.GuildWarRepo.all.find((gw) => now < gw.start.getTime());
                }
                function getPrevGuildWar(current = getActiveGuildWar()) {
                    return current ? data.GuildWarRepo.all.find((gw) => gw.week == current.week - 1) : getPrevGuildWar(getNextGuildWar());
                }
                function arenaToPlayers(json) {
                    let players = [];
                    return (
                        Array.isArray(json) &&
                            json.length > 0 &&
                            json.forEach((match) => {
                                let indexKeys,
                                    indexKey,
                                    playerContainer = match[(Object.keys(match) || [])[0] || "0"],
                                    playerGuids,
                                    playerGuid,
                                    player = playerContainer[(Object.keys(playerContainer) || [])[0] || ""] || null;
                                isPlayer(player) && players.push(player);
                            }),
                        players
                    );
                }
                function isGuildWar(json) {
                    return json && json.guilds && json.currentWar && !0;
                }
                function isGuild(json) {
                    return json && json.playerGuild && json.members && !0;
                }
                function isArena(json) {
                    return arenaToPlayers(json).length && !0;
                }
                function isPlayer(json) {
                    return json && json.id && json.firstPlayedVersion && !0;
                }
                function isGuildMembers(json) {
                    return json && Array.isArray(json) && !json.map(isGuildPlayer).includes(!1);
                }
                function isGuildPlayer(json) {
                    return !!(json && json.playerId && json.archetypeLevels);
                }
                let _init;
                async function init() {
                    return _init || (_init = Promise.all([data.guilds.init(), bh.Repo.init()])), _init;
                }
                (data.BattleCardRepo = new bh.BattleCardRepo(bh.DataSheetID, bh.BattleCardRepoGID, bh.NO_CACHE)),
                    (data.BoosterCardRepo = new bh.BoosterCardRepo(bh.DataSheetID, bh.BoosterCardRepoGID, bh.USE_CACHE)),
                    (data.DungeonRepo = new bh.DungeonRepo(bh.DataSheetID, bh.DungeonRepoGID, bh.NO_CACHE)),
                    (data.EffectRepo = new bh.EffectRepo(bh.DataSheetID, bh.EffectRepoGID, bh.NO_CACHE)),
                    (data.HeroRepo = new bh.HeroRepo(bh.DataSheetID, bh.HeroRepoGID, bh.USE_CACHE)),
                    (data.ItemRepo = new bh.ItemRepo(bh.DataSheetID, bh.ItemRepoGID, bh.USE_CACHE)),
                    (data.MonthlyRepo = new bh.Repo(bh.DataSheetID, bh.MonthlyRepoGID, bh.USE_CACHE)),
                    (data.PlayerRepo = new bh.Repo()),
                    (data.WildCardRepo = new bh.Repo(bh.DataSheetID, bh.WildCardRepoGID, bh.USE_CACHE)),
                    (data.GuildWarRepo = new bh.Repo(bh.DataSheetID, bh.GuildWarGID, bh.USE_CACHE)),
                    (data.getWar = getWar),
                    (data.getActiveGuildWar = getActiveGuildWar),
                    (data.getNextGuildWar = getNextGuildWar),
                    (data.getPrevGuildWar = getPrevGuildWar),
                    (data.arenaToPlayers = arenaToPlayers),
                    (data.isGuildWar = isGuildWar),
                    (data.isGuild = isGuild),
                    (data.isArena = isArena),
                    (data.isPlayer = isPlayer),
                    (data.isGuildMembers = isGuildMembers),
                    (data.isGuildPlayer = isGuildPlayer),
                    (data.init = init);
            })((data = bh.data || (bh.data = {})));
    })(bh || (bh = {})),
    (function (bh) {
        let data;
        !(function (data) {
            function getMaxEvo(rarityType) {
                return rarityType + 1;
            }
            function evoMultiplier(fromEvo) {
                return [0.8, 0.85, 0.88, 0.9, 1][fromEvo];
            }
            function wildsForEvo(rarityType, currentEvoLevel) {
                return [[1], [1, 2], [1, 2, 4], [1, 2, 4, 5], [1, 2, 3, 4, 5]][rarityType || 0][currentEvoLevel || 0];
            }
            function getNextWildCardsNeeded(playerCard) {
                return wildsForEvo(playerCard.rarityType, playerCard.evo);
            }
            function getMaxWildCardsNeeded(playerCard) {
                let max = getMaxEvo(playerCard.rarityType),
                    needed = 0;
                for (let evo = playerCard.evo; evo < max; evo++) needed += wildsForEvo(playerCard.rarityType, evo);
                return needed;
            }
            function getBaseGoldNeeded(rarityType, currentEvoLevel) {
                return [[1e3], [3700, 11300], [4200, 19200, 49e3], [25e3, 44e3, 7e4, 155e3], [45e3, 9e4, 18e4, 36e4, 54e4]][rarityType][currentEvoLevel];
            }
            function getMinGoldNeeded(rarityType, currentEvoLevel) {
                let sands = bh.ItemRepo.sandsOfTime;
                return getBaseGoldNeeded(rarityType, currentEvoLevel) + getMinSotNeeded(rarityType, currentEvoLevel) * bh.ItemRepo.getValue(sands.itemType, sands.rarityType);
            }
            function getMaxGoldNeeded(rarityType, currentEvoLevel) {
                let base = getBaseGoldNeeded(rarityType, currentEvoLevel),
                    sands = bh.ItemRepo.sandsOfTime,
                    sotCosts,
                    matCounts,
                    matCosts,
                    matCostsSum,
                    runeCosts,
                    crystalCosts;
                return (
                    base +
                    getMaxSotNeeded(rarityType, currentEvoLevel) * bh.ItemRepo.getValue(sands.itemType, sands.rarityType) +
                    [0, 1, 2, 3]
                        .map((matRarityType) => getMaxMatNeeded(rarityType, currentEvoLevel, matRarityType))
                        .map((count, rarityType) => count * bh.ItemRepo.getValue(bh.ItemType.EvoJar, rarityType))
                        .reduce((sum, cost) => sum + cost, 0) +
                    getMaxRunesNeeded(rarityType, currentEvoLevel) * bh.ItemRepo.getValue(bh.ItemType.Rune, bh.RarityType.Rare) +
                    getMaxCrystalsNeeded(rarityType, currentEvoLevel) * bh.ItemRepo.getValue(bh.ItemType.Crystal, bh.RarityType.Uncommon)
                );
            }
            function calcMaxGoldNeeded(playerCard, evoAndLevel) {
                let needed = 0,
                    rarityType = (data.BattleCardRepo.find(playerCard.configId) || {}).rarityType || 0,
                    evoCap = getMaxEvo(rarityType);
                for (let i = +evoAndLevel.split(/\./)[0]; i < evoCap; i++) needed += getMaxGoldNeeded(rarityType, i);
                return needed;
            }
            function getMinSotNeeded(rarityType, currentEvoLevel) {
                return [[0], [2, 5], [5, 10, 20], [10, 20, 30, 40], [20, 30, 40, 60, 60]][rarityType || 0][currentEvoLevel || 0];
            }
            function getMaxSotNeeded(rarityType, currentEvoLevel) {
                return [[10], [12, 15], [15, 20, 30], [20, 30, 40, 60], [30, 40, 60, 80, 100]][rarityType || 0][currentEvoLevel || 0];
            }
            function calcMaxSotNeeded(playerCard, evoAndLevel) {
                let needed = 0,
                    rarityType = (data.BattleCardRepo.find(playerCard.configId) || {}).rarityType || 0,
                    evoCap = getMaxEvo(rarityType);
                for (let i = +evoAndLevel.split(/\./)[0]; i < evoCap; i++) needed += getMaxSotNeeded(rarityType, i);
                return needed;
            }
            function getMaxMatNeeded(cardRarityType, currentEvoLevel, matRarityType) {
                return (
                    ([
                        [[12]],
                        [
                            [12, 2],
                            [12, 6, 2],
                        ],
                        [
                            [14, 2],
                            [26, 10, 4],
                            [, 14, 8, 6],
                        ],
                        [
                            [26, 6, 2],
                            [40, 20, 12],
                            [, 26, 16, 8],
                            [, 26, 20, 12],
                        ],
                        [
                            [40, 20, 12],
                            [, 26, 16, 8],
                            [, 30, 24, 12],
                            [, 36, 30, 16],
                        ],
                    ][cardRarityType][currentEvoLevel] || [])[matRarityType] || 0
                );
            }
            function getMinCrystalsNeeded(rarityType, currentEvoLevel) {
                return rarityType == bh.RarityType.Legendary && 4 == currentEvoLevel ? 30 : 0;
            }
            function getMaxCrystalsNeeded(rarityType, currentEvoLevel) {
                return rarityType == bh.RarityType.Legendary && 4 == currentEvoLevel ? 60 : 0;
            }
            function calcMaxCrystalsNeeded(playerCard, evoAndLevel) {
                let needed = 0,
                    rarityType = (data.BattleCardRepo.find(playerCard.configId) || {}).rarityType || 0,
                    evoCap = getMaxEvo(rarityType);
                for (let i = +evoAndLevel.split(/\./)[0]; i < evoCap; i++) needed += data.getMaxCrystalsNeeded(rarityType, i);
                return needed;
            }
            function getMinRunesNeeded(rarityType, currentEvoLevel) {
                return rarityType == bh.RarityType.Legendary && 4 == currentEvoLevel ? 30 : 0;
            }
            function getMaxRunesNeeded(rarityType, currentEvoLevel) {
                return rarityType == bh.RarityType.Legendary && 4 == currentEvoLevel ? 60 : 0;
            }
            function calcMaxRunesNeeded(playerCard, evoAndLevel) {
                let needed = 0,
                    rarityType = (data.BattleCardRepo.find(playerCard.configId) || {}).rarityType || 0,
                    evoCap = getMaxEvo(rarityType);
                for (let i = +evoAndLevel.split(/\./)[0]; i < evoCap; i++) needed += data.getMaxRunesNeeded(rarityType, i);
                return needed;
            }
            (data.getMaxEvo = getMaxEvo),
                (data.evoMultiplier = evoMultiplier),
                (data.wildsForEvo = wildsForEvo),
                (data.getNextWildCardsNeeded = getNextWildCardsNeeded),
                (data.getMaxWildCardsNeeded = getMaxWildCardsNeeded),
                (data.getBaseGoldNeeded = getBaseGoldNeeded),
                (data.getMinGoldNeeded = getMinGoldNeeded),
                (data.getMaxGoldNeeded = getMaxGoldNeeded),
                (data.calcMaxGoldNeeded = calcMaxGoldNeeded),
                (data.getMinSotNeeded = getMinSotNeeded),
                (data.getMaxSotNeeded = getMaxSotNeeded),
                (data.calcMaxSotNeeded = calcMaxSotNeeded),
                (data.getMaxMatNeeded = getMaxMatNeeded),
                (data.getMinCrystalsNeeded = getMinCrystalsNeeded),
                (data.getMaxCrystalsNeeded = getMaxCrystalsNeeded),
                (data.calcMaxCrystalsNeeded = calcMaxCrystalsNeeded),
                (data.getMinRunesNeeded = getMinRunesNeeded),
                (data.getMaxRunesNeeded = getMaxRunesNeeded),
                (data.calcMaxRunesNeeded = calcMaxRunesNeeded);
        })((data = bh.data || (bh.data = {})));
    })(bh || (bh = {})),
    (function (bh) {
        let data;
        !(function (data) {
            let guilds;
            !(function (guilds) {
                let _names = [],
                    _guilds = [],
                    _init;
                function findByGuid(guid) {
                    return _guilds.find((guild) => guild && guild.playerGuild && guild.playerGuild.id == guid);
                }
                function filterByName(value) {
                    return filterNamesByName(value)
                        .map((name) => findByGuid(name.guid))
                        .filter((guild) => !!guild);
                }
                function filterNamesByName(name) {
                    let lower = (name || "").toLowerCase();
                    return _names.filter((name) => name.lower == lower);
                }
                function filterNamesByParent(parent) {
                    return (parent && _names.filter((name) => name.parent === parent)) || [];
                }
                function findNameByGuid(guid) {
                    return _names.filter((name) => name.guid == guid)[0] || null;
                }
                function getNames() {
                    return _names.slice();
                }
                function updateLeaderBoard(results) {
                    results &&
                        results.leaderboardEntries &&
                        results.leaderboardEntries.forEach((entry) => {
                            let name = findNameByGuid(entry.id);
                            name || (put(entry.id, entry.name), (name = findNameByGuid(entry.id))), (name.leaderBoardEntry = entry);
                        });
                }
                function put(guidOrGuild, name, parent) {
                    if (name) {
                        let _name = _names.find((n) => n.guid == guidOrGuild);
                        _name
                            ? ((_name.lower = (name || "").toLowerCase()), (_name.name = name || ""), (_name.parent = _name.parent || parent || null))
                            : _names.push({ guid: guidOrGuild, lower: (name || "").toLowerCase(), name: name || null, parent: parent || null });
                    } else if (Array.isArray(guidOrGuild)) {
                        let guid = guidOrGuild[0].guildId,
                            guildName = findNameByGuid(guid),
                            existing = guildName && findByGuid(guildName.guid);
                        existing ? (existing.members = guidOrGuild) : _guilds.push({ playerGuild: { members: guidOrGuild.map((player) => ({ playerId: player.playerId })), id: guid, name: guildName.name }, members: guidOrGuild });
                    } else {
                        let guild = guidOrGuild,
                            playerGuild = guild.playerGuild;
                        if (playerGuild) {
                            put(playerGuild.id, playerGuild.name);
                            let index = _guilds.findIndex((g) => g.playerGuild.id == playerGuild.id);
                            -1 < index ? (_guilds[index] = guidOrGuild) : _guilds.push(guidOrGuild), guild.members.forEach((player) => data.PlayerRepo.put(new bh.Player(player)));
                        }
                    }
                }
                function init() {
                    return (
                        _init ||
                            (_init = new Promise((resolvefn) => {
                                let tsv = (bh.TSV || {})[String(bh.GuildsGID)];
                                tsv
                                    ? resolvefn(parseTSV(tsv))
                                    : bh.Repo.fetchTsv(null, bh.GuildsGID).then(
                                          (tsv) => resolvefn(parseTSV(tsv)),
                                          () => resolvefn(_names)
                                      );
                            })),
                        _init
                    );
                }
                function parseTSV(tsv) {
                    return (_names = bh.Repo.mapTsv(tsv));
                }
                (guilds.findByGuid = findByGuid),
                    (guilds.filterByName = filterByName),
                    (guilds.filterNamesByName = filterNamesByName),
                    (guilds.filterNamesByParent = filterNamesByParent),
                    (guilds.findNameByGuid = findNameByGuid),
                    (guilds.getNames = getNames),
                    (guilds.updateLeaderBoard = updateLeaderBoard),
                    (guilds.put = put),
                    (guilds.init = init);
            })((guilds = data.guilds || (data.guilds = {})));
        })((data = bh.data || (bh.data = {})));
    })(bh || (bh = {})),
    (function (bh) {
        function formatPlayerHeroScout(playerHero) {
            let locked = !playerHero || playerHero.isLocked,
                level = locked ? "/" : playerHero.level,
                hp = locked ? "/" : bh.utils.truncateNumber(playerHero.hitPoints),
                op = !locked && playerHero.hasOP,
                powerPercent,
                powerRating,
                maxPowerRating;
            return formatScout(level, hp, locked ? "/" : playerHero.powerPercent + "%", locked ? "/" : playerHero.powerRating, !!op, locked ? "/" : playerHero.hero.maxPowerRating);
        }
        function formatHeroScout(level = "/", hp = "/", powerPercent = "/", powerRating = "/", op = !1) {
            return formatScout(level, hp, powerPercent, powerRating, op, "/");
        }
        function formatScout(level, hp, powerPercent, powerRating, op, maxPowerRating) {
            return bh.ScoutTemplate.replace(/\{level\}/g, level)
                .replace(/\{hp\}/g, hp)
                .replace(/\{powerPercent\}/g, powerPercent)
                .replace(/\{powerRating\}/g, powerRating)
                .replace(/\{maxPowerRating\}/g, maxPowerRating)
                .replace(/\{op\}/g, op ? "Y" : "N")
                .replace(/\{opNeg\}/g, op ? "-" : "");
        }
        let data;
        (bh.ScoutTemplate = "{level}|{hp}|{opNeg}{powerPercent}"),
            (function (data) {
                let reports;
                !(function (reports_1) {
                    let reports = {};
                    function getReport(guid) {
                        let report = getGuildWarReport(guid);
                        return report[guid] || (report = getGuildReport(guid)), report[guid] || (report = getGuildMembersReport(guid)), report[guid] || (report = reports), report;
                    }
                    reports_1.getReport = getReport;
                    let guilds = {};
                    function putGuild(guild) {
                        return guild && guild.playerGuild ? ((guilds[guild.playerGuild.id] = guild), getGuildReport(guild.playerGuild.id)) : {};
                    }
                    function getGuildReport(guid) {
                        return (guilds[guid] && guildMembersToReport(guilds[guid].members)) || {};
                    }
                    (reports_1.putGuild = putGuild), (reports_1.getGuildReport = getGuildReport);
                    let guildMembers = {};
                    function putGuildMembers(members) {
                        return (guildMembers[members[0].guildId] = members.slice()), getGuildMembersReport(members[0].guildId);
                    }
                    function getGuildMembersReport(guid) {
                        return (guildMembers[guid] && guildMembersToReport(guildMembers[guid])) || {};
                    }
                    (reports_1.putGuildMembers = putGuildMembers), (reports_1.getGuildMembersReport = getGuildMembersReport);
                    let guildWars = {};
                    function putGuildWar(war) {
                        return war.guilds.forEach((guild) => (guildWars[guild.id] = war)), getGuildWarReport(war.guilds[0].id);
                    }
                    function getGuildWarReport(guid) {
                        return (guildWars[guid] && guildWarToReport(guildWars[guid])) || {};
                    }
                    function guildMembersToReport(members) {
                        let report = {},
                            guildGuid;
                        return (report[members[0].guildId] = members.slice().sort(bh.utils.sort.byPositionThenName).map(mapMemberToOutput).join("\n")), report;
                    }
                    function mapMemberToOutput(member, index) {
                        let player = data.PlayerRepo.find(member.playerId),
                            role = bh.PositionType[member.position] + 1,
                            fame = member.fameLevel + 1,
                            heroData = data.HeroRepo.sorted.map(player ? mapPlayerHero : mapHero),
                            position = index ? index + 1 : "GL",
                            memberName = member.name;
                        return player && !player.hasWarBragEquipped && (memberName += " Ã¸"), [position, fame, memberName, role, ...heroData].join("\t");
                        function mapHero(hero) {
                            let level = member.archetypeLevels[hero.guid] + 1,
                                hp = level && bh.utils.truncateNumber(hero.getHitPoints(level));
                            return (level && formatHeroScout(level, hp)) || "/|/|/";
                        }
                        function mapPlayerHero(hero) {
                            let playerHero;
                            return formatPlayerHeroScout(player.heroes.find((h) => hero.guid == h.guid));
                        }
                    }
                    function calculateBattleData(war, member) {
                        let battles = war.currentWar.battles,
                            winCount = 0,
                            lossCount = 0,
                            dwCount = 0,
                            brags = 0,
                            score = 0;
                        return (
                            member &&
                                battles.forEach((battle) => {
                                    battle.initiator.playerId == member.playerId && (battle.initiator.winner ? winCount++ : lossCount++, battle.completedBragId && brags++, (score += battle.initiator.totalScore)),
                                        battle.opponent.playerId == member.playerId && (battle.opponent.winner && dwCount++, (score += battle.opponent.totalScore));
                                }),
                            { winCount: winCount, lossCount: lossCount, dwCount: dwCount, score: score, brags: brags }
                        );
                    }
                    function guildWarToReport(war) {
                        let us = war.guilds[0],
                            them = war.guilds.find((g) => g.id != us.id),
                            ourMembers = war.members[us.id].sort(bh.utils.sort.byPositionThenName),
                            theirMembers = war.members[them.id].sort(bh.utils.sort.byPositionThenName),
                            ourOutput = ourMembers.map((m, i) => _mapMemberToOutput(i, m, theirMembers[i])).join("\n"),
                            theirOutput = theirMembers.map((m, i) => _mapMemberToOutput(i, m, ourMembers[i])).join("\n"),
                            report = {};
                        return (report[us.id] = ourOutput), (report[them.id] = theirOutput), report;
                        function _mapMemberToOutput(index, member, oppo) {
                            let memberTsv = mapMemberToOutput(member, index),
                                battleData = calculateBattleData(war, member);
                            return `${memberTsv}\t${battleData.winCount}\t${battleData.lossCount}\t${battleData.dwCount}\t${battleData.score}`;
                        }
                    }
                    (reports_1.putGuildWar = putGuildWar), (reports_1.getGuildWarReport = getGuildWarReport);
                })((reports = data.reports || (data.reports = {})));
            })((data = bh.data || (bh.data = {})));
    })(bh || (bh = {})),
    (function (bh) {
        let css;
        !(function (css) {
            function addCardTypes($ = bh.$()) {
                let style = $("<style type='text/css' id='bh-hud-cardtypes'/>").appendTo($("head"));
                style.append(`div.bh-hud-image.img-Attack { background-image:url('${bh.getSrc("cardtypes", "Attack")}'); }`),
                    style.append(`div.bh-hud-image.img-Brag { background-image:url('${bh.getSrc("cardtypes", "Brag")}'); }`),
                    style.append(`div.bh-hud-image.img-BattleCard { background-image:url('${bh.getSrc("cardtypes", "BattleCard")}'); }`),
                    style.append(`div.bh-hud-image.img-Heal { background-image:url('${bh.getSrc("cardtypes", "Heal")}'); }`),
                    style.append(`div.bh-hud-image.img-Shield { background-image:url('${bh.getSrc("cardtypes", "Shield")}'); }`),
                    style.append(`div.bh-hud-image.img-WildCard { background-image:url('${bh.getSrc("cardtypes", "WildCard")}'); }`);
            }
            function addEffects($ = bh.$()) {
                let style = $("<style type='text/css' id='bh-hud-effects'/>").appendTo($("head"));
                bh.data.EffectRepo.all.forEach((effect) => style.append(`div.bh-hud-image.img-${effect.guid} { background-image:url('${bh.EffectRepo.toImageSrc(effect)}'); }`));
            }
            function addElements($ = bh.$()) {
                let style = $("<style type='text/css' id='bh-hud-elements'/>").appendTo($("head"));
                bh.ElementRepo.allTypes.forEach((elementType) =>
                    elementType == bh.ElementType.Neutral ? void 0 : style.append(`div.bh-hud-image.img-${bh.ElementType[elementType]} { background-image:url('${bh.ElementRepo.toImageSrc(elementType)}'); }`)
                );
            }
            function addHeroes($ = bh.$()) {
                let style = $("<style type='text/css' id='bh-hud-heroes'/>").appendTo($("head"));
                bh.data.HeroRepo.all.forEach((hero) => style.append(`div.bh-hud-image.img-${hero.guid} { background-image:url('${bh.HeroRepo.toImageSrc(hero)}'); }`));
            }
            function addItems($ = bh.$()) {
                let style = $("<style type='text/css' id='bh-hud-items'/>").appendTo($("head"));
                bh.data.ItemRepo.all.forEach((item) => style.append(`div.bh-hud-image.img-${item.guid} { background-image:url('${bh.ItemRepo.toImageSrc(item)}'); }`));
            }
            function addKlasses($ = bh.$()) {
                let style = $("<style type='text/css' id='bh-hud-klasses'/>").appendTo($("head")),
                    widths = [16, 12, 12];
                bh.KlassRepo.allTypes.forEach((klassType) =>
                    style.append(`div.bh-hud-image.img-${bh.KlassType[klassType]} { width:16px; background-size:${widths[klassType]}px 20px; background-image:url('${bh.KlassRepo.toImageSrc(klassType)}'); }`)
                );
            }
            (css.addCardTypes = addCardTypes), (css.addEffects = addEffects), (css.addElements = addElements), (css.addHeroes = addHeroes), (css.addItems = addItems), (css.addKlasses = addKlasses);
        })((css = bh.css || (bh.css = {})));
    })(bh || (bh = {})),
    (function (bh) {
        let _win,
            funcs = [],
            resolved = !1,
            tries = 0,
            promise;
        function loaded(win) {
            return (
                (_win = _win || win),
                promise ||
                    (promise = new Promise((res, rej) => {
                        wait(res, rej),
                            $(() => {
                                res();
                            });
                    }))
            );
        }
        function wait(res, rej) {
            if (!resolved)
                return ++tries > 60
                    ? rej("60 tries")
                    : void (_win && _win.jQuery && _win.document && _win.document.body
                          ? (_win.jQuery(() => {
                                funcs.forEach((fn) => fn());
                            }),
                            res())
                          : resolved || setTimeout(wait, 1500, res, rej));
        }
        function jqFN() {
            return jqObj;
        }
        bh.loaded = loaded;
        let jqObj = { on: jqFN, val: jqFN },
            events;
        function $(selector) {
            return selector ? ("function" != typeof selector || (_win && _win.jQuery) ? ((_win && _win.jQuery) || jqFN)(selector) : funcs.push(selector)) : (_win && _win.jQuery) || jqFN;
        }
        (bh.$ = $),
            (function (events) {
                function updateSecondsToMore() {
                    $("[data-seconds-to-more]")
                        .toArray()
                        .forEach((element) => {
                            let seconds = +element.getAttribute("data-seconds-to-more");
                            if (seconds) {
                                element.setAttribute("data-seconds-to-more", String(seconds - 1));
                                let minutes = Math.floor(seconds / 60),
                                    hours = Math.floor(minutes / 60);
                                element.innerText = `${`0${hours}`.slice(-2)}:${`0${minutes}`.slice(-2)}:${`0${seconds}`.slice(-2)} to Next`;
                            } else element.innerText = "Full";
                        });
                }
                function init() {
                    bh.data.init().then(() => {
                        $("body").on("click", "[data-action]", onClickAction),
                            $("body").on("change", "[data-change-action]", onChangeAction),
                            $("body").on("dblclick", "[data-dblclick-action]", onDblClickAction),
                            setInterval(updateSecondsToMore, 1e3),
                            bh.utils.getFromStorage("BH-HUD-GameOnly") == String(!0) && toggleGameOnly();
                    });
                }
                function toggle(key, value) {
                    key && String(value).length && $(`.jai-hud-inventory-buttons > button[data-action="toggle-${key}"][data-${key}="${value}"]`).toggleClass("active");
                    let elements = $('.jai-hud-inventory-buttons > [data-action="toggle-element"].active')
                            .toArray()
                            .map((el) => el.getAttribute("data-element")),
                        klasses = $('.jai-hud-inventory-buttons > [data-action="toggle-klass"].active')
                            .toArray()
                            .map((el) => el.getAttribute("data-klass")),
                        types = $('.jai-hud-inventory-buttons > [data-action="toggle-type"].active')
                            .toArray()
                            .map((el) => el.getAttribute("data-type")),
                        rarities = $('.jai-hud-inventory-buttons > [data-action="toggle-rarity"].active')
                            .toArray()
                            .map((el) => el.getAttribute("data-rarity"));
                    $(".jai-hud-inventory-items-container > div").hide(),
                        elements.length || klasses.length || types.length
                            ? $(".jai-hud-inventory-items-container > div").each((i, elem) => {
                                  let el = $(elem),
                                      element = !elements.length || elements.includes(String(el.data("elementType"))),
                                      klass = !klasses.length || klasses.includes(String(el.data("klassType"))) || klasses.includes(el.data("brag")),
                                      type = !types.length || types.includes(el.data("type")) || types.includes(String(el.data("itemType"))),
                                      rarity = !rarities.length || rarities.includes(el.data("rarity")) || rarities.includes(String(el.data("rarityType")));
                                  element && klass && type && rarity && el.show();
                              })
                            : $('.jai-hud-inventory-items-container > div[data-hud="true"]').show();
                }
                function togglePower(playerGuid) {
                    let container = $(`div.jai-hud-scouter-player${playerGuid ? `[data-guid="${playerGuid}"]` : ".active"}`),
                        powerTags = ["rating-percent", "percent-rating", "rating", "percent"],
                        oldPowerIndex = powerTags.indexOf(container.data("power") || "rating-percent"),
                        newPower = powerTags[oldPowerIndex + 1] || "rating-percent",
                        heroes;
                    container.data("power", newPower),
                        bh.utils.setToStorage("BH-HUD-PowerText", newPower),
                        playerGuid || (playerGuid = container.data("guid")),
                        bh.data.PlayerRepo.find(playerGuid)
                            .heroes.filter((hero) => !hero.isLocked)
                            .forEach((hero) => container.find(`[data-guid="${playerGuid}-${hero.guid}"] .hero-rating`).html(bh.hud.scouter.formatScouterPowerRating(hero)));
                }
                (events.init = init), (events.toggle = toggle);
                let sortTags = ["element-klass", "power-percent-asc", "power-asc", "hp-asc", "name"];
                function sortHeroesByTag(a, b, sortTag = bh.utils.getFromStorage("BH-HUD-SortTag")) {
                    if ("power-percent-asc" == sortTag) {
                        let aP = a.powerPercent,
                            bP = b.powerPercent;
                        if (aP != bP) return aP < bP ? -1 : 1;
                    }
                    if ("power-asc" == sortTag) {
                        let aP = a.powerRating,
                            bP = b.powerRating;
                        if (aP != bP) return aP < bP ? -1 : 1;
                    }
                    if ("hp-asc" == sortTag) {
                        let aHP = a.hitPoints,
                            bHP = b.hitPoints;
                        if (aHP != bHP) return aHP < bHP ? -1 : 1;
                    }
                    return "name" == sortTag ? bh.utils.sort.byName(a, b) : bh.utils.sort.byElementThenKlass(a, b);
                }
                function sortHeroes(playerGuid) {
                    let container = $(`div.jai-hud-scouter-player${playerGuid ? `[data-guid="${playerGuid}"]` : ".active"}`),
                        oldSortIndex = sortTags.indexOf(bh.utils.getFromStorage("BH-HUD-SortTag") || container.data("sort") || "element-klass"),
                        newSortTag = sortTags[oldSortIndex + 1] || "element-klass";
                    container.data("sort", newSortTag),
                        bh.utils.setToStorage("BH-HUD-SortTag", newSortTag),
                        playerGuid || (playerGuid = container.data("guid")),
                        bh.data.PlayerRepo.find(playerGuid)?.heroes.sort((a, b) => sortHeroesByTag(a, b, newSortTag))
                            .forEach((hero) => container.find(`[data-guid="${playerGuid}-${hero.guid}"]`).appendTo(container));
                }
                events.sortHeroesByTag = sortHeroesByTag;
                let battlecardsSortTags = ["rarity-evo-name", "rarity-name-evo", "name-rarity-evo"];
                function sortBattleCardsByTag(battleCards, sortTag = bh.utils.getFromStorage("BH-HUD-BattlecardsSortTag") || "rarity-evo-name") {
                    let sortFn = "rarity-evo-name" == sortTag ? bh.utils.sort.byRarityThenEvoLevelThenName : "rarity-name-evo" == sortTag ? bh.utils.sort.byRarityThenNameThenEvoLevel : bh.utils.sort.byNameThenRarityThenEvo;
                    return battleCards?.sort(sortFn);
                }
                function sortBattleCards(playerGuid) {
                    let container = $(`div.jai-hud-inventory-items-container.battlecards[data-player-guid="${playerGuid}"]`).empty(),
                        oldSortIndex = battlecardsSortTags.indexOf(bh.utils.getFromStorage("BH-HUD-BattlecardsSortTag") || container.data("sort") || "rarity-evo-name"),
                        newSortTag = battlecardsSortTags[oldSortIndex + 1] || "rarity-evo-name";
                    container.data("sort", newSortTag),
                        bh.utils.setToStorage("BH-HUD-BattlecardsSortTag", newSortTag),
                        sortBattleCardsByTag(bh.data.PlayerRepo.find(playerGuid)?.battleCards, newSortTag).forEach((card) => container.append(card.rowHtml));
                }
                function onChangeAction(ev) {
                    let el, action;
                    switch ($(ev.target).closest("[data-change-action]").data("changeAction")) {
                        case "toggle-scouter-guild":
                            bh.hud.guild.selectGuildReport();
                            break;
                        case "toggle-scouter-player":
                            bh.hud.player.selectPlayerReport();
                    }
                }
                function togglePlayerScouter(override) {
                    let el = $("div#jai-hud-scouter-player-report");
                    !0 === override ? el.addClass("active") : !1 === override ? el.removeClass("active") : el.toggleClass("active");
                    let visible = el.hasClass("active");
                    $('button.jai-hud-toggle[data-action="toggle-player-scouter"]').text(visible ? "[-]" : "[+]");
                }
                function toggleGameOnly() {
                    jQuery("#primarywrap").siblings(":not(#jai-hud-container)").toggleClass("d-none"),
                        jQuery("#primarylayout").siblings().toggleClass("d-none"),
                        jQuery(".upper_gamepage").parent().siblings().toggleClass("d-none"),
                        jQuery(".upper_gamepage").siblings().toggleClass("d-none");
                    let hidden = jQuery("#floating_game_holder").siblings().toggleClass("d-none").hasClass("d-none");
                    bh.utils.setToStorage("BH-HUD-GameOnly", String(hidden));
                }
                function onClickAction(ev) {
                    let el = $(ev.target).closest("[data-action]"),
                        action = el.data("action"),
                        guid;
                    switch (action) {
                        case "toggle-game-only":
                            toggleGameOnly();
                            break;
                        case "refresh-guild":
                            bh.Messenger.send("refresh-guild", $("#jai-hud-scouter-guild-target").val());
                            break;
                        case "refresh-player":
                            bh.Messenger.send("refresh-player", $("#jai-hud-scouter-player-target").val());
                            break;
                        case "hud-to-library":
                            bh.library.openLibraryFromHud();
                            break;
                        case "hud-to-local-library":
                            bh.library.openLibraryFromHud(!0);
                            break;
                        case "toggle-power":
                            togglePower();
                            break;
                        case "sort-heroes":
                            sortHeroes();
                            break;
                        case "toggle-child":
                            let active = $(`div[data-parent-guid="${(guid = el.data("guid"))}"]`)
                                .toggleClass("active")
                                .hasClass("active");
                            $(`button[data-action="toggle-child"][data-guid="${guid}"]`).text(active ? "[-]" : "[+]");
                            break;
                        case "toggle-rarity":
                            toggle("rarity", el.data("rarity"));
                            break;
                        case "toggle-element":
                            toggle("element", el.data("element"));
                            break;
                        case "toggle-klass":
                            toggle("klass", el.data("klass"));
                            break;
                        case "toggle-type":
                            toggle("type", el.data("type"));
                            break;
                        case "toggle-scouter-hero":
                            let panel, content;
                            el.closest("[data-guid]").find(".jai-hud-scouter-panel-content").toggleClass("active");
                            break;
                        case "toggle-hud-bigger":
                            bh.hud.resize(!0);
                            break;
                        case "toggle-hud-smaller":
                            bh.hud.resize(!1);
                            break;
                        case "toggle-guild-scouter": {
                            let visible = $("textarea#jai-hud-scouter-guild-report").toggleClass("active").hasClass("active");
                            $('button.jai-hud-toggle[data-action="toggle-guild-scouter"]').text(visible ? "[-]" : "[+]");
                            break;
                        }
                        case "toggle-player-scouter":
                            togglePlayerScouter();
                            break;
                        case "toggle-inventory": {
                            let visible = $("div.jai-hud-inventory-container").toggleClass("active").hasClass("active");
                            $('button.jai-hud-toggle[data-action="toggle-inventory"]').text(visible ? "[-]" : "[+]");
                            break;
                        }
                        case "rr":
                            bh.Messenger.send("rr", el.hasClass("active") ? -1 : +el.data("count")),
                                el.toggleClass("active").css(el.hasClass("active") ? { "background-color": "#fcf8e3", color: "#666" } : { "background-color": "#f2dede", color: "#666" }),
                                el.hasClass("active") && el.html('<img src="./images/misc/Gift.png" style="visibility:hidden;">');
                            break;
                        default:
                            console.log(action);
                    }
                }
                function onDblClickAction(ev) {
                    let el = $(ev.target).closest("[data-dblclick-action]"),
                        action;
                    switch (el.data("dblclickAction")) {
                        case "sort-battlecards":
                            sortBattleCards(el.closest("[data-player-guid]").data("playerGuid"));
                    }
                }
                (events.sortBattleCardsByTag = sortBattleCardsByTag), (events.togglePlayerScouter = togglePlayerScouter);
            })((events = bh.events || (bh.events = {})));
    })(bh || (bh = {})),
    (function (bh) {
        let root, images;
        function getRoot() {
            return root || (root = String(location.href).toLowerCase().includes("battlehand-hud/") ? "." : bh.host), root;
        }
        function img(src, css, _style, _title) {
            let onerror = "",
                klass = css ? `class="${css}"` : "",
                style = _style ? `style="${_style}"` : "",
                title = _title ? `title="${_title}"` : "";
            return src.includes("glyphicons-82-refresh") && (onerror = "onerror=\"bh.$(this).replaceWith('&#8634;')\""), `<img src="${src}" ${klass} ${style} ${title} ${onerror}/>`;
        }
        function getImg(...parts) {
            return img(getSrc(...parts));
        }
        function getImg12(...parts) {
            return img(getSrc(...parts), "icon-12");
        }
        function getImg20(...parts) {
            return img(getSrc(...parts), "icon-20");
        }
        function getImgG(...parts) {
            return img(getSrc(...parts), "grayscale");
        }
        function getSrc(...parts) {
            let sliced = parts.slice(),
                image = images[sliced.shift()];
            for (; sliced.length; ) image = image[sliced.shift()];
            return image || (image = `${getRoot()}/images/${parts.join("/")}.png`), image;
        }
        (bh.img = img),
            (bh.getImg = getImg),
            (bh.getImg12 = getImg12),
            (bh.getImg20 = getImg20),
            (bh.getImgG = getImgG),
            (bh.getSrc = getSrc),
            (function (images) {
                let battlecards, cardtypes, classes, crystals, effects, elements, evojars, heroes, icons, keys, misc, runes, skills;
                !(function (battlecards) {
                    let blank, icons;
                    (blank = battlecards.blank || (battlecards.blank = {})), (icons = battlecards.icons || (battlecards.icons = {}));
                })((battlecards = images.battlecards || (images.battlecards = {}))),
                    (cardtypes = images.cardtypes || (images.cardtypes = {})),
                    (classes = images.classes || (images.classes = {})),
                    (crystals = images.crystals || (images.crystals = {})),
                    (effects = images.effects || (images.effects = {})),
                    (elements = images.elements || (images.elements = {})),
                    (function (evojars) {
                        let random;
                        random = evojars.random || (evojars.random = {});
                    })((evojars = images.evojars || (images.evojars = {}))),
                    (heroes = images.heroes || (images.heroes = {})),
                    (icons = images.icons || (images.icons = {})),
                    (keys = images.keys || (images.keys = {})),
                    (misc = images.misc || (images.misc = {})),
                    (runes = images.runes || (images.runes = {})),
                    (skills = images.skills || (images.skills = {}));
            })((images = bh.images || (bh.images = {})));
    })(bh || (bh = {})),
    (function (bh) {
        let hud;
        (bh.isHud = !1),
            (bh.isListener = !1),
            (bh.isLocal = !1),
            (function (hud) {
                let listener;
                !(function (listener) {
                    let resolution;
                    function handleMessage(message) {
                        bh.Messenger.isValidMessage(message)
                            ? actionItems.forEach((item) => {
                                  if (item && item.callbackfn && ("hud" != item.where || bh.isHud) && ("listener" != item.where || bh.isListener) && item.action == message.action)
                                      try {
                                          item.callbackfn(message);
                                      } catch (ex) {
                                          console.error(message.action, ex);
                                      }
                              })
                            : console.log("invalid message", message);
                    }
                    !(function (resolution) {
                        let _win,
                            _resolve,
                            _hud = !1,
                            _listener = !1,
                            resolved = !1;
                        function setResolve(win, resolve) {
                            (_win = win), (_resolve = resolve);
                        }
                        function resolveHud() {
                            (_hud = !0), resolve();
                        }
                        function resolveListener() {
                            (_listener = !0), resolve();
                        }
                        function resolve() {
                            resolved || (_hud && _listener && (_resolve(_win), (resolved = !0)));
                        }
                        (resolution.setResolve = setResolve), (resolution.resolveHud = resolveHud), (resolution.resolveListener = resolveListener);
                    })(resolution || (resolution = {}));
                    let actionItems = [{ where: "all", action: "hud-init", url: null, callbackfn: resolution.resolveHud }];
                    function addAction(where, action, url, callbackfn) {
                        actionItems.push({ where: where, action: action, url: url, callbackfn: callbackfn });
                    }
                    function addListenerAction(action, url, callbackfn) {
                        addAction("listener", action, url, callbackfn);
                    }
                    function addHudAction(action, url, callbackfn) {
                        addAction("hud", action, url, callbackfn);
                    }
                    function init(version, win, host = "https://bh.rasberik.com/") {
                        return (
                            (bh.Version = version),
                            new Promise((res, rej) => {
                                let href = String((win && win.location && win.location.href) || "").toLowerCase();
                                (bh.isLocal = href.includes("battlehand-hud/default.htm") || href.includes("battlehand-hud/iframe.htm")),
                                    (bh.isHud = href.includes("battlehand-hud/default.htm") || href.startsWith("http://www.kongregate.com/games/anotherplaceprod/battlehand-web")),
                                    (bh.isListener = href.includes("battlehand-hud/iframe.htm") || href.startsWith("http://game261051.konggames.com/gamez/")),
                                    (bh.host = host),
                                    bh.isHud
                                        ? ((win.bh = bh),
                                          XmlHttpRequest.attach(win),
                                          bh.loaded(win).then(
                                              () => {
                                                  bh.Messenger.initialize(win, handleMessage),
                                                      bh.data.init().then(
                                                          () => {
                                                              hud.render(), addHudAction("rr", null, hRr), bh.Messenger.send("hud-init", "hud-init"), res(win);
                                                          },
                                                          () => rej("data.init rejected")
                                                      );
                                              },
                                              (reason) => rej("loaded(win) rejected: " + reason)
                                          ))
                                        : bh.isListener
                                        ? (addListenerAction("rr", null, lRr), resolution.setResolve(win, res), XmlHttpRequest.attach(win, readyStateChangeListener), bh.Messenger.initialize(win, handleMessage))
                                        : rej("not hud nor listener");
                            })
                        );
                    }
                    function readyStateChangeListener() {
                        handleReadyStateChange(this);
                    }
                    function urlToAction(url) {
                        let actionItem = actionItems.find((item) => url.includes(item.url));
                        return (actionItem && actionItem.action) || null;
                    }
                    function hasCommand(json, ...commands) {
                        return (
                            null !=
                            Object.keys(json).find((key) => {
                                let response = json[key];
                                if (response && Array.isArray(response)) return null != response.find((command) => command && commands.includes(command.cmd));
                            })
                        );
                    }
                    function isPreResponse(json) {
                        return !1;
                    }
                    function isPostResponse(json) {
                        return !1;
                    }
                    function isRrResponse(json) {
                        return hasCommand(json, "give_milestone_rewards", "craft_wildcard", "complete_dungeon");
                    }
                    function notifyOfStamina(json) {
                        let hasStamina = bh.CommandResponse.getStamina(json);
                        (hasStamina.stamina || hasStamina.secondsToMoreStamina) && bh.Messenger.send("notify-of-stamina", hasStamina);
                    }
                    (listener.addListenerAction = addListenerAction), (listener.addHudAction = addHudAction), (listener.init = init), (listener.hasCommand = hasCommand);
                    let _rr = !1,
                        xhrPre,
                        xhrPost,
                        xhrRr;
                    async function lRr(message) {
                        if (message.data > 0)
                            if (xhrRr || xhrPost) {
                                if (!_rr) {
                                    _rr = !0;
                                    let count = message.data || 1;
                                    for (; _rr && count--; ) {
                                        let xhr;
                                        if (xhrPre && (!(xhr = await xhrPre.resend()) || !xhr.requestJSON)) break;
                                        if (!(xhr = await (xhrRr || xhrPost).resend()) || !xhr.requestJSON) break;
                                        bh.Messenger.send("rr", count);
                                    }
                                    (_rr = !1), (xhrPre = xhrPost = xhrRr = null), bh.Messenger.send("rr", 0);
                                }
                            } else bh.Messenger.send("rr", -1);
                        else (_rr = !1), (xhrPre = xhrPost = xhrRr = null);
                    }
                    async function hRr(message) {
                        let el = bh.$('[data-action="rr"]');
                        message.data > 0
                            ? el
                                  .addClass("active")
                                  .html(String(+el.data("count") - +message.data))
                                  .css({ "background-color": "#fcf8e3", color: "#666" })
                            : (el.removeClass("active").css({ "background-color": "#f2dede", color: "#666" }), bh.Messenger.send("refresh-player", bh.Messenger.ActivePlayerGuid));
                    }
                    function handleReadyStateChange(xhr) {
                        if (xhr.readyState == XmlHttpRequest.DONE) {
                            let match = xhr.requestUrl.match(/\?player=([a-z0-9]{8}(?:\-[a-z0-9]{4}){3}\-[a-z0-9]{12})&sessionKey=([a-z0-9]{32})(?:&guild(?:Id)?=([a-z0-9]{8}(?:\-[a-z0-9]{4}){3}\-[a-z0-9]{12}))?/);
                            if (match) {
                                let action = urlToAction(xhr.requestUrl),
                                    playerGuid,
                                    sessionKey,
                                    guildGuid,
                                    message = { action: action, playerGuid: match[1], sessionKey: match[2], guildGuid: match[3], data: xhr.responseJSON };
                                if (!action) return;
                                resolution.resolveListener(), bh.Messenger.instance.postMessage(message);
                            } else if (bh.isListener && xhr.requestUrl.includes("/v1/packet/execute")) {
                                let json = xhr.responseJSON;
                                if (json && bh.Player.isMe) {
                                    let notifyGUI = !1;
                                    isRrResponse(json) && ((xhrPre = xhrPost = null), (xhrRr = xhr), (notifyGUI = !0)), notifyGUI && bh.Messenger.send("repeatable", json);
                                }
                            }
                        }
                    }
                    listener.handleReadyStateChange = handleReadyStateChange;
                })((listener = hud.listener || (hud.listener = {})));
            })((hud = bh.hud || (bh.hud = {})));
    })(bh || (bh = {})),
    (function (bh) {
        let hud;
        !(function (hud) {
            let arena;
            !(function (arena) {
                function selectArenaMatches(message) {
                    bh.$('#jai-hud-scouter-player-target > option[value="arena"]').length || bh.$("#jai-hud-scouter-player-target").children().first().after("<option value='arena'>Arena Opponents</option>");
                    let matches = message.data,
                        players;
                    bh.data.arenaToPlayers(matches).forEach((player, i) => hud.scouter.loadPlayer(new bh.Player(player, !0), i)), bh.$("#jai-hud-scouter-player-target").val("arena"), hud.player.selectPlayerReport();
                }
                function arenaGet(message) {
                    let player = bh.Player.me;
                    player && ((player.arenaInfo = new bh.ArenaInfo(message.data)), hud.player.loadPlayer(player));
                }
                hud.listener.addHudAction("get-arena-matches", "/v1/matchmaking/getmatches?", selectArenaMatches), hud.listener.addHudAction("get-arena-update", "/v1/player/pit?", arenaGet);
            })((arena = hud.arena || (hud.arena = {})));
        })((hud = bh.hud || (bh.hud = {})));
    })(bh || (bh = {})),
    (function (bh) {
        let hud;
        !(function (hud) {
            let guild;
            !(function (guild_1) {
                function showContainer() {
                    let container;
                    bh.$("div.jai-hud-scouter-guild-container").length ||
                        bh
                            .$("div.jai-hud-scouter-player-container")
                            .before(
                                `<div class="jai-hud-scouter-guild-container"><button class="bs-btn bs-btn-link bs-btn-xs jai-hud-toggle pull-right" data-action="toggle-guild-scouter">[-]</button><button class="bs-btn bs-btn-link bs-btn-xs jai-hud-toggle pull-right" data-action="refresh-guild">${bh.getImg12(
                                    "icons",
                                    "glyphicons-82-refresh"
                                )}</button><select id="jai-hud-scouter-guild-target" data-change-action="toggle-scouter-guild"></select><textarea id="jai-hud-scouter-guild-report" rows="1" type="text" class="active"></textarea></div>`
                            ),
                        bh.$("div.jai-hud-scouter-guild-container").addClass("active");
                }
                function addGuild(message) {
                    let guild = message.data,
                        guid = guild && guild.playerGuild && guild.playerGuild.id,
                        name = guild && guild.playerGuild && guild.playerGuild.name;
                    guid && name && (bh.data.guilds.put(guid, name), bh.data.reports.putGuild(guild), addGuildReport(guid));
                }
                function addGuildSearchResults(message) {
                    let results;
                    message.data.forEach((guild) => bh.data.guilds.put(guild.id, guild.name));
                }
                function addGuildMembers(message) {
                    let members = message.data,
                        guid = members[0].guildId;
                    bh.data.reports.putGuildMembers(members), addGuildReport(guid);
                }
                function addLeaderboardGuildMembers(message) {
                    addGuildReport(message.guildGuid);
                }
                function addGuildWar(message) {
                    let war = message.data;
                    war && war.guilds && (war.guilds.forEach((guild) => bh.data.guilds.put(guild.id, guild.name)), bh.data.reports.putGuildWar(war), war.guilds.forEach((guild) => addGuildReport(guild.id)));
                }
                function addGuildLeaderBoard(message) {
                    let results = message.data;
                    bh.data.guilds.updateLeaderBoard(results), updateGuildOptions();
                }
                function addGuildReport(guid) {
                    let guildName = bh.data.guilds.findNameByGuid(guid);
                    if (!guildName) return console.log(`guildName not found: ${guid}`);
                    let player = bh.Player.me,
                        playerGuildParent = (player && player.guildParent) || null,
                        guilds = (playerGuildParent && bh.data.guilds.filterNamesByParent(playerGuildParent)) || [],
                        isGuild = player && player.guildGuid == guid;
                    showContainer();
                    let select = bh.$("#jai-hud-scouter-guild-target");
                    select.find(`option[value="${guid}"]`).length ||
                        (select.append(`<option value="${guid}">${guildName.name}</option>`),
                        select
                            .children()
                            .toArray()
                            .filter((opt) => player && opt.value != player.guildGuid)
                            .sort((a, b) => (a.text < b.text ? -1 : a.text == b.text ? 0 : 1))
                            .forEach((el) => select.append(el))),
                        select.val(guid),
                        selectGuildReport();
                }
                function updateGuildOptions() {
                    bh.$("#jai-hud-scouter-guild-target").children().toArray().forEach(updateGuildOption);
                }
                function updateGuildOption(opt) {
                    if (!opt || !opt.value) return;
                    let guid = opt.value,
                        guildName = bh.data.guilds.findNameByGuid(guid),
                        leaderBoardEntry = (guildName && guildName.leaderBoardEntry) || null,
                        rankText,
                        winLossText,
                        text = `${(leaderBoardEntry && `#${leaderBoardEntry.rank + 1} `) || ""}${
                            (leaderBoardEntry && (leaderBoardEntry.wins || leaderBoardEntry.losses) && `(${guildName.leaderBoardEntry.wins}/${guildName.leaderBoardEntry.losses}) `) || ""
                        }${guildName.name}`;
                    opt.text = text;
                }
                function selectGuildReport() {
                    let guid = bh.$("#jai-hud-scouter-guild-target").val();
                    updateGuildOption(bh.$(`#jai-hud-scouter-guild-target > option[value="${guid}"]`)[0]), bh.$("#jai-hud-scouter-guild-report").val(bh.data.reports.getReport(guid)[guid] || "");
                }
                function searchGuilds(filter, deep) {
                    let url = `https://battlehand-game-kong.anotherplacegames.com/v1/guild/getguilds?player=${bh.Messenger.ActivePlayerGuid}&sessionKey=${bh.Messenger.ActiveSessionKey}&name=${filter}&joinableonly=False&language=&minfamelevel=2&maxfamelevel=44`;
                    return new Promise((res, rej) => {
                        if (!bh.Messenger.ActivePlayerGuid || !bh.Messenger.ActiveSessionKey) return rej("not initialized");
                        XmlHttpRequest.getJSON(url).then((json) => {
                            if (!json || !Array.isArray(json)) return rej("invalid json");
                            guildsGetMembers(json, deep).then(res, rej);
                        }, rej);
                    });
                }
                function guildsGetMembers(guilds, deep) {
                    return new Promise((res, rej) => {
                        let _guilds = guilds.slice(),
                            guild;
                        function fetch() {
                            (guild = _guilds.shift()) ? setTimeout(() => guildGetMembers(guild.id, deep).then(fetch, fetch), hud._delayMS) : res();
                        }
                        fetch();
                    });
                }
                function guildGetMembers(guid, deep) {
                    let url = `https://battlehand-game-kong.anotherplacegames.com/v1/guild/getmembers?player=${bh.Messenger.ActivePlayerGuid}&sessionKey=${bh.Messenger.ActiveSessionKey}&guild=${guid}`;
                    return (
                        bh.isLocal && (url = `./json/${guid}.json`),
                        new Promise((res, rej) =>
                            bh.Messenger.ActivePlayerGuid && bh.Messenger.ActiveSessionKey
                                ? guid
                                    ? void XmlHttpRequest.getJSON(url).then((json) => {
                                          if (!json || !Array.isArray(json)) return rej("invalid json");
                                          if ((bh.Messenger.send("get-guild-members", json), deep)) {
                                              let memberGuids = json.map((member) => member.playerId);
                                              hud.player.playersGet(memberGuids).then(res, res);
                                          } else res(json);
                                      }, rej)
                                    : rej("no guild id")
                                : rej("not initialized")
                        )
                    );
                }
                function leaderBoardGet(start = 0, count = 13) {
                    let url = `https://battlehand-game-kong.anotherplacegames.com/v1/guildwars/getrange?player=${bh.Messenger.ActivePlayerGuid}&sessionKey=${bh.Messenger.ActiveSessionKey}&start=${start}&count=${count}`;
                    return (
                        bh.isLocal && (url = "./json/top_guilds.json"),
                        new Promise((res, rej) => {
                            if (!bh.Messenger.ActivePlayerGuid || !bh.Messenger.ActiveSessionKey) return rej("not initialized");
                            XmlHttpRequest.getJSON(url).then((json) => {
                                if (!json || !json.leaderboardEntries) return rej("invalid json");
                                bh.Messenger.send("get-leaderboard", json), res(json);
                            }, rej);
                        })
                    );
                }
                (guild_1.addGuildReport = addGuildReport),
                    (guild_1.selectGuildReport = selectGuildReport),
                    hud.listener.addHudAction("get-guild", "/v1/guild/get?", addGuild),
                    hud.listener.addHudAction("get-guild-members", "/v1/guild/getmembers?", addGuildMembers),
                    hud.listener.addHudAction("get-guild-war", "/v1/guildwars/get?", addGuildWar),
                    hud.listener.addHudAction("get-leaderboard", "/v1/guildwars/getrange?", addGuildLeaderBoard),
                    hud.listener.addHudAction("get-guildsearch", "/v1/guild/getguilds?", addGuildSearchResults),
                    hud.listener.addHudAction("get-leaderboard-members", "/v1/guildwars/getguildmembersrange?", addLeaderboardGuildMembers),
                    (guild_1.searchGuilds = searchGuilds),
                    (guild_1.guildsGetMembers = guildsGetMembers),
                    (guild_1.guildGetMembers = guildGetMembers),
                    (guild_1.leaderBoardGet = leaderBoardGet),
                    hud.listener.addListenerAction("refresh-guild", null, (message) => {
                        guildGetMembers(message.data, !0);
                    }),
                    hud.listener.addListenerAction("search-guilds", null, (message) => {
                        searchGuilds(message.data, !0);
                    });
            })((guild = hud.guild || (hud.guild = {})));
        })((hud = bh.hud || (bh.hud = {})));
    })(bh || (bh = {})),
    (function (bh) {
        let utils, UuidUtils;
        !(function (utils) {
            function getFromStorage(key) {
                let output;
                try {
                    output = localStorage.getItem(key);
                } catch (ex) {
                    output = null;
                }
                return output;
            }
            function setToStorage(key, data) {
                let success = !1;
                try {
                    localStorage.setItem(key, data), (success = !0);
                } catch (ex) {}
                return success;
            }
            function formatNumber(value) {
                let neg = value < 0 ? "-" : "",
                    num = String(Math.abs(value)).split(""),
                    out = [],
                    o = 0;
                for (let i = num.length; i--; ) out.length && o % 3 == 0 && out.unshift(","), out.unshift(num.pop()), o++;
                return neg + out.join("");
            }
            function truncateNumber(value) {
                let out = utils.formatNumber(value),
                    parts = out.split(",");
                return 1 == parts.length ? out : 1 == parts[0].length ? `${parts[0]}.${parts[1][0]}k` : `${parts[0]}k`;
            }
            function parseBoolean(value) {
                let string = String(value),
                    char = string.substring(0, 1).toLowerCase();
                return "y" === char || "t" === char || "1" === string;
            }
            function evoToStars(rarityType, evoLevel = String(rarityType + 1)) {
                let evo = +evoLevel.split(".")[0],
                    stars = rarityType + 1,
                    count = 0,
                    value = "";
                for (; evo--; ) count++, (value += "<span class='evo-star'>&#9733;</span>");
                for (; count < stars; ) count++, (value += "<span class='star'>&#9734;</span>");
                return value;
            }
            function getBase64Image(src) {
                let img = document.createElement("img");
                img.setAttribute("src", src);
                let canvas = document.createElement("canvas"),
                    ctx,
                    dataURL;
                return (canvas.width = img.width), (canvas.height = img.height), canvas.getContext("2d").drawImage(img, 0, 0), canvas.toDataURL("image/png");
            }
            function createImagesJs() {
                let allTypes = Object.keys(bh.images),
                    loadedTypes = [],
                    imageSources = bh
                        .$("img")
                        .toArray()
                        .map((img) => img.src)
                        .reduce((arr, src) => (arr.includes(src) ? arr : arr.concat(src)), []),
                    output = "";
                (output += "let bh;(function (bh) {let images;(function (images) {"),
                    bh.$("#data-output").val("Loading, please wait ..."),
                    asyncForEach(imageSources, async (imageSource) => {
                        let parts = imageSource.split("/images/")[1].split(".")[0].split("/");
                        allTypes.includes(parts[0]) &&
                            2 == parts.length &&
                            (loadedTypes.includes(parts[0]) || (loadedTypes.push(parts[0]), (output += `\nimages.${parts[0]} = {};`)), (output += `\nimages.${parts[0]}["${parts[1]}"] = "${getBase64Image(imageSource)}";`));
                    }).then(() => {
                        (output += "\n})(images = bh.images || (bh.images = {}));})(bh || (bh = {}));"), bh.$("#data-output").val(output);
                    });
            }
            (utils.getFromStorage = getFromStorage),
                (utils.setToStorage = setToStorage),
                (utils.formatNumber = formatNumber),
                (utils.truncateNumber = truncateNumber),
                (utils.parseBoolean = parseBoolean),
                (utils.evoToStars = evoToStars),
                (utils.getBase64Image = getBase64Image),
                (utils.createImagesJs = createImagesJs);
            let loggedCards = {};
            function logMissingCard(playerBattleCard) {
                loggedCards[playerBattleCard.playerCard.id] ||
                    (console.log("Missing BattleCard:", `${playerBattleCard.name}: ${playerBattleCard.playerCard.id} (${playerBattleCard.evoLevel})`), (loggedCards[playerBattleCard.playerCard.id] = !0));
            }
            async function asyncForEach(array, iterator, thisArg) {
                for (let index = 0, len = array.length; index < len; index++) await iterator.call(thisArg, array[index], index, array).catch((err) => console.warn(err instanceof Error ? err : new Error(err)));
                return array;
            }
            function flat(array) {
                return array.flat ? array.flat(1 / 0) : array.reduce((out, curr) => out.concat(Array.isArray(curr) ? flat(curr) : [curr]), []);
            }
            (utils.logMissingCard = logMissingCard), (utils.asyncForEach = asyncForEach), (utils.flat = flat);
        })((utils = bh.utils || (bh.utils = {}))),
            (function (UuidUtils) {
                let CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz".split("");
                function isValid(uuid) {
                    let uuidString = String(uuid),
                        parts = uuidString.split("-");
                    return (
                        5 === parts.length &&
                        8 === parts[0].length &&
                        4 === parts[1].length &&
                        4 === parts[2].length &&
                        4 === parts[3].length &&
                        12 === parts[4].length &&
                        "4" === uuidString[14] &&
                        !uuidString
                            .replace(/-/g, "")
                            .split("")
                            .find((c) => !CHARS.includes(c))
                    );
                }
                function generate() {
                    let chars = CHARS,
                        uuid = [],
                        i,
                        r;
                    for (uuid[8] = uuid[13] = uuid[18] = uuid[23] = "-", uuid[14] = "4", i = 0; i < 36; i++) uuid[i] || ((r = 0 | (16 * Math.random())), (uuid[i] = chars[19 == i ? (3 & r) | 8 : r]));
                    return uuid.join("");
                }
                (UuidUtils.isValid = isValid), (UuidUtils.generate = generate);
            })((UuidUtils = bh.UuidUtils || (bh.UuidUtils = {})));
    })(bh || (bh = {})),
    (function (bh) {
        let hud;
        !(function (hud) {
            function _collectionCountRowHtml(id, text, c, m) {
                let _collectionCount = `<div data-type="CollectionCount" data-rarity-type="${c.rarityType}">Total Cards <span class="badge pull-right bg-green">${c.count}</span></div>`,
                    _collectionDuplicateCount = `<div data-type="CollectionCount" data-rarity-type="${c.rarityType}">Duplicate Cards <span class="badge pull-right bg-green">${c.duplicate} / ${c.rarityCount}</span></div>`,
                    _collectionDuplicatePercent = `<div data-type="CollectionCount" data-rarity-type="${c.rarityType}">Duplicate Completion <span class="badge pull-right bg-green">${c.duplicatePercent}%</span></div>`,
                    _collectionUniqueCount = `<div data-type="CollectionCount" data-rarity-type="${c.rarityType}">Unique Cards <span class="badge pull-right bg-green">${c.unique} / ${c.rarityCount}</span></div>`,
                    _collectionUniquePercent = `<div data-type="CollectionCount" data-rarity-type="${c.rarityType}">Collection Completion <span class="badge pull-right bg-green">${c.uniquePercent}%</span></div>`,
                    _maxedCount = `<div data-type="CollectionCount" data-rarity-type="${m.rarityType}">Total Cards (maxed) <span class="badge pull-right bg-pink">${m.count}</span></div>`,
                    _maxedDuplicateCount = `<div data-type="CollectionCount" data-rarity-type="${m.rarityType}">Duplicate Cards (maxed) <span class="badge pull-right bg-pink">${m.duplicate} / ${m.rarityCount}</span></div>`,
                    _maxedDuplicatePercent = `<div data-type="CollectionCount" data-rarity-type="${m.rarityType}">Duplicate Completion (maxed) <span class="badge pull-right bg-pink">${m.duplicatePercent}%</span></div>`,
                    _maxedUniqueCount = `<div data-type="CollectionCount" data-rarity-type="${m.rarityType}">Unique Cards (maxed) <span class="badge pull-right bg-pink">${m.unique} / ${m.rarityCount}</span></div>`,
                    _maxedUniquePercent = `<div data-type="CollectionCount" data-rarity-type="${m.rarityType}">Collection Completion (maxed) <span class="badge pull-right bg-pink">${m.uniquePercent}%</span></div>`,
                    _text = `${text} <span class="pull-right"><span class="badge bg-pink">${m.uniquePercent < 100 ? m.uniquePercent : 100 + m.duplicatePercent}%</span> <span class="badge bg-green">${
                        c.uniquePercent < 100 ? c.uniquePercent : 100 + c.duplicatePercent
                    }%</span></span>`,
                    expandable = bh.renderExpandable(
                        id,
                        _text,
                        _collectionCount +
                            _collectionUniqueCount +
                            _collectionUniquePercent +
                            _collectionDuplicateCount +
                            _collectionDuplicatePercent +
                            _maxedCount +
                            _maxedUniqueCount +
                            _maxedUniquePercent +
                            _maxedDuplicateCount +
                            _maxedDuplicatePercent
                    );
                return `<div data-type="CollectionCount" data-rarity-type="${c.rarityType}">${expandable}</div>`;
            }
            function collectionCountRowHtml(cc) {
                return cc.rarityBragCount
                    ? _collectionCountRowHtml("collection-" + cc.rarityType, `${bh.getImg20("cardtypes", "BattleCard")} ${bh.RarityType[cc.rarityType]} (All)`, cc.all, cc.maxedAll) +
                          _collectionCountRowHtml("collection-" + cc.rarityType + "-non", `${bh.getImg20("cardtypes", "BattleCard")} ${bh.RarityType[cc.rarityType]} (non-Brag)`, cc.non, cc.maxedNon) +
                          _collectionCountRowHtml("collection-" + cc.rarityType + "-brag", `${bh.getImg20("cardtypes", "Brag")} ${bh.RarityType[cc.rarityType]} (Brag)`, cc.brag, cc.maxedBrag)
                    : _collectionCountRowHtml("collection-" + cc.rarityType, `${bh.getImg20("cardtypes", "BattleCard")} ${bh.RarityType[cc.rarityType]}`, cc.all, cc.maxedAll);
            }
            function missingCards(player) {
                let expander = [bh.RarityType.Common, bh.RarityType.Uncommon, bh.RarityType.Rare, bh.RarityType.SuperRare, bh.RarityType.Legendary]
                    .map((rarityType) => {
                        let filteredByRarity = bh.data.BattleCardRepo.all.filter((bc) => bc.rarityType == rarityType && !player.battleCards.find((pbc) => pbc.playerCard.configId == bc.guid)),
                            elements,
                            html = filteredByRarity
                                .map((bc) => bc.elementType)
                                .reduce((out, curr) => (out.includes(curr) ? out : out.concat([curr])), [])
                                .map((elementType) => {
                                    let filteredByElement = filteredByRarity.filter((bc) => bc.elementType === elementType),
                                        list = filteredByElement.map((bc) => `${(bc.brag && bh.getImg12("cardtypes", "Brag")) || ""}${bc.name}`).join(", ");
                                    return `${bh.getImg12("crystals", bh.ElementType[elementType])} ${bh.ElementType[elementType]} (${filteredByElement.length}): ${list}`;
                                })
                                .join("<br/>"),
                            expandable = bh.renderExpandable(`collection-missing-${rarityType}`, `${bh.getImg("cardtypes", "BattleCard")} ${bh.RarityType[rarityType]} (${filteredByRarity.length})`, html);
                        return `<div data-type="CollectionCount" data-rarity-type="${rarityType}">${expandable}</div>`;
                    })
                    .join("");
                return `<div data-type="CollectionCount">${bh.renderExpandable("collection-missing", "Missing Cards", expander)}</div>`;
            }
            function monthlyRewardsRowHtml(player) {
                let lastClaimed = player.monthlyRewardsClaimed.length,
                    collected = [],
                    current,
                    future = [];
                return (
                    bh.data.MonthlyRepo.all.map((month) => {
                        let card = bh.data.BattleCardRepo.find(month.card);
                        card &&
                            (month.month - 1 < lastClaimed
                                ? collected.push(`<div data-type="MonthlyReward">Month ${month.month}: ${card.name}</div>`)
                                : lastClaimed < month.month - 1
                                ? future.push(`<div data-type="MonthlyReward">Month ${month.month}: ${card.name}</div>`)
                                : (current = `<div data-type="MonthlyReward">Month ${month.month}: ${card.name} <span class="badge pull-right bg-yellow">Day ${player.monthlyRewardDay} / 31</span></div>`));
                    }),
                    `<div data-type="MonthlyReward">${bh.renderExpandable("MonthlyRewardCollected", `Collected <span class="badge pull-right bg-green">${collected.length}</span>`, collected.join(""))}</div>` +
                        current +
                        `<div data-type="MonthlyReward">${bh.renderExpandable("MonthlyRewardFuture", `Future <span class="badge pull-right bg-pink">${future.length}</span>`, future.join(""))}</div>`
                );
            }
            function renderOtherInfo(icon, text, ...badges) {
                let html = "";
                return (html += `<div data-type="OtherInfo">${icon} ${text}${badges.map((badge) => ` <span class="badge pull-right">${badge}</span>`)}</div>`);
            }
            function otherInfoRowHtml(player) {
                let detailsHtml = "";
                return (
                    (detailsHtml += renderOtherInfo("", "First Version Played", player._pp.firstPlayedVersion)),
                    (detailsHtml += renderOtherInfo("", "Number of Sessions", bh.utils.formatNumber(player._pp.numSessions))),
                    (detailsHtml += renderOtherInfo("", "Total Campaign Dungeons Entered", bh.utils.formatNumber(player._pp.totalCampaignDungeonsEntered))),
                    (detailsHtml += renderOtherInfo("", "Total Campaign Dungeons Won", bh.utils.formatNumber(player._pp.totalCampaignDungeonsWon))),
                    (detailsHtml += renderOtherInfo("", "Total Campaign Dungeon Stars", bh.utils.formatNumber(player.totalDungeonStars))),
                    (detailsHtml += renderOtherInfo(bh.getImg20("misc", "Coin"), "Gold", bh.utils.formatNumber(player.gold))),
                    (detailsHtml += renderOtherInfo(bh.getImg20("misc", "Coin"), "Total Gold Bought", bh.utils.formatNumber(player._pp.totalGoldBought))),
                    (detailsHtml += renderOtherInfo(bh.getImg20("misc", "Coin"), "Total Gold Earned", bh.utils.formatNumber(player._pp.totalGoldEarned))),
                    (detailsHtml += renderOtherInfo(bh.getImg20("misc", "Coin"), "Total Gold Spent", bh.utils.formatNumber(player._pp.totalGoldSpent))),
                    (detailsHtml += renderOtherInfo(bh.getImg20("misc", "GemStone"), "Gems", bh.utils.formatNumber(player.gems))),
                    (detailsHtml += renderOtherInfo(bh.getImg20("misc", "GemStone"), "Total Gems Bought", bh.utils.formatNumber(player._pp.totalGemsBought))),
                    (detailsHtml += renderOtherInfo(bh.getImg20("misc", "GemStone"), "Total Gems Earned", bh.utils.formatNumber(player._pp.totalGemsEarned))),
                    (detailsHtml += renderOtherInfo(bh.getImg20("misc", "GemStone"), "Total Gems Spent", bh.utils.formatNumber(player._pp.totalGemsSpent))),
                    (detailsHtml += renderOtherInfo(bh.getImg20("misc", "Fragments"), "Fragments", bh.utils.formatNumber(player.fragments))),
                    (detailsHtml += renderOtherInfo(bh.getImg20("misc", "Fragments"), "Total Fragments Spent", bh.utils.formatNumber(player._pp.totalFragmentsSpent))),
                    (detailsHtml += renderOtherInfo(bh.getImg20("keys", "RaidTicket"), "Raid Keys", bh.utils.formatNumber(player.raidTickets))),
                    (detailsHtml += renderOtherInfo(bh.getImg20("keys", "RaidTicket"), "Total Raid Keys Earned", bh.utils.formatNumber(player._pp.totalRaidKeysEarned))),
                    (detailsHtml += renderOtherInfo(bh.getImg20("keys", "RaidTicket"), "Total Raid Keys Spent", bh.utils.formatNumber(player._pp.totalRaidKeysSpent))),
                    (detailsHtml += renderOtherInfo(bh.getImg20("keys", "GoldKey"), "Arena Keys", bh.utils.formatNumber(player.arenaInfo.stamina))),
                    (detailsHtml += renderOtherInfo(bh.getImg20("keys", "GoldKey"), "Total Arena Keys Bought", bh.utils.formatNumber(player.arenaInfo.purchasedStamina))),
                    (detailsHtml += renderOtherInfo(bh.getImg20("keys", "GoldKey"), "Total Arena Battles Fought", bh.utils.formatNumber(player.arenaInfo.totalPitBattles))),
                    (detailsHtml += renderOtherInfo(bh.getImg20("keys", "GoldKey"), "Total Arena Battles Won", bh.utils.formatNumber(player.arenaInfo.totalPitWins))),
                    (detailsHtml += renderOtherInfo(bh.getImg20("keys", "GoldKey"), "Total Arena Battles Win Percentage", player.arenaInfo.totalPitWinPercentage + "%"))
                );
            }
            let player;
            (hud._delayMS = 500),
                (function (player_1) {
                    function loadPlayer(player) {
                        if (player.isExtended) {
                            bh.data.PlayerRepo.put(player);
                            let inventory,
                                inventoryContainer = bh.$("div.jai-hud-inventory").addClass("active").find(".jai-hud-inventory-container"),
                                inventoryItemsContainer = inventoryContainer.find(`.jai-hud-inventory-items-container.other[data-player-guid="${player.guid}"]`),
                                inventoryBattlecardsContainer = inventoryContainer.find(`.jai-hud-inventory-items-container.battlecards[data-player-guid="${player.guid}"]`),
                                inventoryBoostersContainer = inventoryContainer.find(`.jai-hud-inventory-items-container.boosters[data-player-guid="${player.guid}"]`);
                            inventoryBoostersContainer.length ||
                                (inventoryContainer.append(`<div class="jai-hud-inventory-items-container boosters" data-player-guid="${player.guid}"></div>`),
                                (inventoryBoostersContainer = inventoryContainer.find(`.jai-hud-inventory-items-container.boosters[data-player-guid="${player.guid}"]`))),
                                inventoryBattlecardsContainer.length ||
                                    (inventoryContainer.append(`<div class="jai-hud-inventory-items-container battlecards" data-player-guid="${player.guid}"></div>`),
                                    (inventoryBattlecardsContainer = inventoryContainer.find(`.jai-hud-inventory-items-container.battlecards[data-player-guid="${player.guid}"]`))),
                                inventoryItemsContainer.length ||
                                    (inventoryContainer.append(`<div class="jai-hud-inventory-items-container other" data-player-guid="${player.guid}"></div>`),
                                    (inventoryItemsContainer = inventoryContainer.find(`.jai-hud-inventory-items-container.other[data-player-guid="${player.guid}"]`))),
                                inventoryBattlecardsContainer.empty().append(player.battleCards.map((card) => card.rowHtml).join("")),
                                inventoryBoostersContainer.empty().append(player.boosterCards.map((card) => card.rowHtml).join("")),
                                inventoryItemsContainer
                                    .empty()
                                    .append(
                                        player.inventory
                                            .sort(bh.utils.sort.byName)
                                            .map((item) => item.rowHtml)
                                            .join("")
                                    )
                                    .append(player.wildCards.map((card) => card.rowHtml).join(""))
                                    .append(player.collectionCounts.map(collectionCountRowHtml).join(""))
                                    .append(missingCards(player))
                                    .append(monthlyRewardsRowHtml(player))
                                    .append(player.boosterRowHtml)
                                    .append(player.goldRowHtml)
                                    .append(player.monthlyRewardRowHtml)
                                    .append(player.arenaInfo.arenaRowHtml)
                                    .append(player.fragsGemsRaidsRowHtml)
                                    .append(player.wildCardRowHtml)
                                    .append(player.collectionPercentRowHtml)
                                    .append(otherInfoRowHtml(player)),
                                bh.events.toggle();
                        }
                    }
                    function addPlayerReport(message) {
                        let json = message.data;
                        addPlayer(new bh.Player(json));
                    }
                    function addPlayer(player) {
                        let select = bh.$("#jai-hud-scouter-player-target"),
                            option = select.find(`option[value="${player.guid}"]`);
                        option.length || (select.append(`<option value="${player.guid}"></option>`), (option = select.find(`option[value="${player.guid}"]`)));
                        let meat = player.isFullMeat ? "&#9734; " : "",
                            brag = player.hasWarBragEquipped ? "" : " &oslash;";
                        if (
                            (option.html(meat + player.htmlFriendlyName + brag),
                            select
                                .children()
                                .toArray()
                                .slice(1)
                                .sort((a, b) => (a.text < b.text ? -1 : a.text == b.text ? 0 : 1))
                                .forEach((el) => select.append(el)),
                            (player.isMe && !player.isExtended) || bh.data.PlayerRepo.put(player),
                            hud.scouter.loadPlayer(player),
                            player.isMe)
                        ) {
                            loadPlayer(player);
                            let guilds = player.guilds;
                            guilds.length && hud.guild.addGuildReport && guilds.forEach((g) => hud.guild.addGuildReport(g.guid));
                        }
                        select.val(player.guid), selectPlayerReport(), hud.guild.selectGuildReport();
                    }
                    function selectPlayerReport() {
                        bh.$("div.jai-hud-scouter-player-container").addClass("active"), bh.events.togglePlayerScouter(!0), bh.$("#jai-hud-scouter-player-report").addClass("active"), bh.$("div.jai-hud-scouter-player").removeClass("active");
                        let guid = bh.$("#jai-hud-scouter-player-target").val();
                        "arena" == guid
                            ? (bh.$('div.jai-hud-scouter-player[data-guid="arena-0"]').addClass("active"),
                              bh.$('div.jai-hud-scouter-player[data-guid="arena-1"]').addClass("active"),
                              bh.$('div.jai-hud-scouter-player[data-guid="arena-2"]').addClass("active"))
                            : bh.$(`div.jai-hud-scouter-player[data-guid="${guid}"]`).addClass("active");
                    }
                    function playersGet(playerGuids) {
                        return new Promise((res, rej) => {
                            let guids = playerGuids.slice(),
                                guid;
                            function fetch() {
                                (guid = guids.shift()) ? setTimeout(() => playerGet(guid).then(fetch, fetch), hud._delayMS) : res();
                            }
                            fetch();
                        });
                    }
                    function playerGet(guid) {
                        let which,
                            url = `https://battlehand-game-kong.anotherplacegames.com/v1/player/${guid == bh.Messenger.ActivePlayerGuid ? "get?" : `getplayerinfo?id_requested_player=${guid}&`}player=${
                                bh.Messenger.ActivePlayerGuid
                            }&sessionKey=${bh.Messenger.ActiveSessionKey}`;
                        return (
                            bh.isLocal && (url = `./json/${guid}.json`),
                            new Promise((res, rej) =>
                                bh.Messenger.ActivePlayerGuid && bh.Messenger.ActiveSessionKey
                                    ? guid
                                        ? void XmlHttpRequest.getJSON(url).then((json) => {
                                              if (!json) return rej("invalid json");
                                              bh.Messenger.send("get-player", json), res(json);
                                          }, rej)
                                        : rej("no player id")
                                    : rej("not initialized")
                            )
                        );
                    }
                    function handleRrResponse(message) {
                        let el = bh.$('[data-action="rr"]');
                        el.hasClass("active") || el.css({ "background-color": "#dff0d8", color: "#666" });
                        let iterations = bh.CommandResponse.getStaminaIterations(message.data) || (bh.Player.isMe && 1e4) || 0;
                        el.attr("data-count", iterations).data("count", iterations), iterations ? el.show() : el.hide();
                    }
                    (player_1.loadPlayer = loadPlayer),
                        (player_1.addPlayerReport = addPlayerReport),
                        (player_1.addPlayer = addPlayer),
                        (player_1.selectPlayerReport = selectPlayerReport),
                        hud.listener.addHudAction("get-player", "/v1/player/get?", addPlayerReport),
                        hud.listener.addHudAction("get-player", "/v1/player/getplayerinfo?", addPlayerReport),
                        hud.listener.addHudAction("notify-of-stamina", null, (msg) => bh.Player.me.setDungeonKeys(msg.data.stamina, msg.data.secondsToMoreStamina)),
                        (player_1.playersGet = playersGet),
                        (player_1.playerGet = playerGet),
                        hud.listener.addListenerAction("refresh-player", null, (message) => {
                            playerGet(message.data);
                        }),
                        hud.listener.addHudAction("repeatable", null, handleRrResponse);
                })((player = hud.player || (hud.player = {})));
        })((hud = bh.hud || (bh.hud = {})));
    })(bh || (bh = {})),
    (function (bh) {
        let hud;
        !(function (hud) {
            function render() {
                renderCss(), renderHtml(), postResize(), bh.events.init();
            }
            function resize(bigger) {
                bigger
                    ? ((hud.WidthCurrent += hud.WidthDelta), hud.WidthCurrent < hud.WidthMinimum && (hud.WidthCurrent = hud.WidthMinimum))
                    : bigger || ((hud.WidthCurrent -= hud.WidthDelta), hud.WidthCurrent && hud.WidthCurrent < hud.WidthMinimum && (hud.WidthCurrent = hud.WidthCollapsed), hud.WidthCurrent || (hud.WidthCurrent = hud.WidthCollapsed)),
                    bh.utils.setToStorage("BH-HUD-WidthCurrent", String(hud.WidthCurrent)),
                    postResize();
            }
            function postResize() {
                let visible = hud.WidthCurrent != hud.WidthCollapsed;
                bh.$("div#jai-hud-container").css("width", hud.WidthCurrent),
                    bh.$("div#jai-hud-container").css("max-height", jQuery(window).height() - 10),
                    bh.$("div.jai-hud-main-container")[visible ? "addClass" : "removeClass"]("active"),
                    bh.$("div.jai-hud-header>span.header")[visible ? "show" : "hide"](),
                    bh.$('div.jai-hud-header>span[data-action="toggle-hud-smaller"]')[visible ? "show" : "hide"](),
                    bh.$("div.jai-hud-container select").css("width", hud.WidthCurrent - 70),
                    bh.$("div.jai-hud-container textarea").css("width", hud.WidthCurrent - 10),
                    bh.$("div.jai-hud-scouter-panel-header > button").css("width", hud.WidthCurrent - 10),
                    bh.$("div.jai-hud-scouter-panel-header > button > span.hero-rating-bar").css("width", hud.WidthCurrent - 230),
                    bh
                        .$("div.jai-hud-scouter-panel-header > button > span.hero-effects")
                        .toArray()
                        .forEach((div) => {
                            let el = bh.$(div),
                                effectsCount = +el.data("count");
                            el.css("width", 20 * effectsCount), el.next().css("width", hud.WidthCurrent - 205 - 20 * effectsCount);
                        });
            }
            function renderCss() {
                bh.$("head").append(
                    '<style id="jai-hud-styles" type="text/css">.d-none {display:none;}div.jai-hud-container .bs-btn{display:inline-block;padding:6px 12px;margin-bottom:0;font-size:14px;font-weight:400;line-height:1.42857143;text-align:center;white-space:nowrap;vertical-align:middle;-ms-touch-action:manipulation;touch-action:manipulation;cursor:pointer;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;background-image:none;border:1px solid transparent;border-radius:4px}div.jai-hud-container .bs-btn-group{position:relative;display:inline-block;vertical-align:middle}div.jai-hud-container .bs-btn-group>.bs-btn{position:relative;float:left}div.jai-hud-container .bs-btn-group-sm>.bs-btn,div.jai-hud-container .bs-btn-sm{padding:5px 10px;font-size:12px;line-height:1.5;border-radius:3px}div.jai-hud-container .bs-btn-group-xs>.bs-btn,div.jai-hud-container .bs-btn-xs{padding:1px 5px;font-size:12px;line-height:1.5;border-radius:3px}div.jai-hud-container .bs-btn-default{color:#333;background-color:#fff;border-color:#ccc}div.jai-hud-container .bs-btn-default.active{color:#333;background-color:#e6e6e6;border-color:#adadad}div.jai-hud-container .bs-btn-link{font-weight:400;color:#337ab7;border-radius:0;background-color:transparent}div.jai-hud-container .progress-bar{margin-bottom:0;height:14px;border-radius:4px;height:100%;line-height:13px;font-size:10px;text-align:center;font-weight:700}div.jai-hud-container .progress-bar.easy{background-color:#d8e6f0;color:#666;border:1px solid #666}div.jai-hud-container .progress-bar.easy.has-op{background-color:#00f;color:#fff}div.jai-hud-container .progress-bar.medium{background-color:#dff0d8;color:#666;border:1px solid #666}div.jai-hud-container .progress-bar.medium.has-op{background-color:#0f0;color:#666}div.jai-hud-container .progress-bar.hard{background-color:#f8eebb;color:#666;border:1px solid #666}div.jai-hud-container .progress-bar.hard.has-op{background-color:#ff0;color:#666;border:1px solid #666}div.jai-hud-container .progress-bar.harder{background-color:#f7d278;color:#666;border:1px solid #666}div.jai-hud-container .progress-bar.harder.has-op{background-color:#f80;color:#fff;}div.jai-hud-container .progress-bar.insane{background-color:#dfaeae;color:#666;border:1px solid #666}div.jai-hud-container .progress-bar.insane.has-op{background-color:#d9534f;color:#fff}div.jai-hud-container .badge{display:inline-block;min-width:10px;padding:3px 7px;font-size:12px;font-weight:700;line-height:1;color:#fff;text-align:center;white-space:nowrap;vertical-align:middle;background-color:#777;border-radius:10px}div.jai-hud-container .badge.bg-danger{background-color:#a94442}div.jai-hud-container .badge.bg-success{background-color:#3c763d}div.jai-hud-container .badge.bg-green{background-color:#dff0d8;color:#666}div.jai-hud-container .badge.bg-pink{background-color:#f2dede;color:#666}div.jai-hud-container .badge.bg-yellow{background-color:#fcf8e3;color:#666;border:1px solid #666}div.jai-hud-container .pull-right{float:right!important}div.jai-hud-container .pull-left{float:left!important}div.jai-hud-container .text-center{text-align:center}div.jai-hud-container{font-family:sans-serif;font-size:8pt;position:fixed;top:0;right:0;background:#fff;color:#000;border:2px solid #000;z-index:9999;padding:2px;overflow:auto}div.jai-hud-container *{vertical-align:middle}div.jai-hud-container button{margin:0;overflow:visible}div.jai-hud-container div{clear:both}div.jai-hud-container table{width:100%;margin:0;padding:0;border:0}div.jai-hud-container td{padding:0;margin:0;border:0}div.jai-hud-container textarea{font-size:8pt;display:none}div.jai-hud-container .Air{background-color:#f3f3f3}div.jai-hud-container .Earth{background-color:#e0eed5}div.jai-hud-container .Fire{background-color:#fce5cd}div.jai-hud-container .Spirit{background-color:#f3e2f6}div.jai-hud-container .Water{background-color:#deeaf4}div.jai-hud-container .grayscale{filter:grayscale(100%)}div.jai-hud-header{text-align:center;font-weight:700}div.jai-hud-child-scroller,div.jai-hud-inventory,div.jai-hud-inventory-container,div.jai-hud-main-container,div.jai-hud-scouter-guild-container,div.jai-hud-scouter-panel-content,div.jai-hud-scouter-player,div.jai-hud-scouter-player-container{display:none}div.jai-hud-child-scroller,div.jai-hud-scouter-panel-content{padding-left:10px}div.jai-hud-scouter-player-report{display:none;padding:0 2px;text-align:left}div.jai-hud-scouter-player>div.player-name{font-size:10pt;font-weight:700;text-align:center}div.jai-hud-scouter-panel-header{padding:2px 0 0 0}div.jai-hud-scouter-panel-header>button,div.jai-hud-scouter-panel-header>button.bs-btn{cursor:default;border:0;text-align:left;padding:0;margin:0}div.jai-hud-scouter-panel-header>button[data-action]{cursor:pointer}div.jai-hud-scouter-panel-header>button>span.hero-icon{display:inline-block;width:20px;text-align:center}div.jai-hud-scouter-panel-header>button>span.hero-level{display:inline-block;width:30px;text-align:right}div.jai-hud-scouter-panel-header>button>span.hero-name{display:inline-block;width:60px}div.jai-hud-scouter-panel-header>button>span.hero-hp{display:inline-block;width:35px;text-align:center;overflow:hidden;vertical-align:bottom}div.jai-hud-scouter-panel-header>button>span.hero-effects{display:inline-block;width:0}div.jai-hud-scouter-panel-header>button>span.hero-rating-bar{display:inline-block;min-width:35px;overflow:hidden;max-width:90px}div.jai-hud-scouter-panel-header span.hero-rating{padding:0 5px}div.jai-hud-container .active{display:block}div.jai-hud-container .star{color:#b8860b;text-shadow:-1px 0 #000,0 1px #000,1px 0 #000,0 -1px #000}div.jai-hud-container .evo-star{color:gold;text-shadow:-1px 0 #000,0 1px #000,1px 0 #000,0 -1px #000}div.jai-hud-container img{height:16px;width:16px}div.jai-hud-container img.icon-12{height:12px;width:12px}div.jai-hud-container img.icon-20{height:20px;width:20px}div.jai-hud-child-scroller{max-height:180px;overflow:auto}div.jai-hud-child-scroller.active,div.jai-hud-scouter-panel-content.active{border:1px solid #aaa;border-radius:10px}div.jai-hud-container .badge,div.jai-hud-container .bs-btn-group-xs>.bs-btn,div.jai-hud-container .bs-btn-xs{font-size:11px}div.jai-hud-container [data-action=sort-heroes],div.jai-hud-container [data-action=toggle-power]{cursor:pointer}div.jai-hud-container .bs-btn-group-xs>.bs-btn{width:28px;}</style>'
                );
            }
            function inventoryButton(type, typeValue, imgType, imgName) {
                return `<button class="bs-btn bs-btn-default jai-hud-button" type="button" data-action="toggle-${type}" data-${type}="${typeValue}">${bh.getImg(imgType, imgName || typeValue)}</button>`;
            }
            function renderHtml() {
                let versionAttributes,
                    html = `<div class="jai-hud-header">\n\t<button class="bs-btn bs-btn-link bs-btn-xs jai-hud-toggle pull-left" data-action="toggle-hud-bigger">[+]</button>\n\t<button class="bs-btn bs-btn-link bs-btn-xs jai-hud-toggle pull-right" data-action="toggle-hud-smaller">[-]</button>\n\t<span class="header" data-action="toggle-game-only">Jai's HUD <span ${
                        bh.Version !== bh.CurrentVersion ? `style="color:red;cursor:pointer;" title="Please upgrade to v${bh.CurrentVersion}"` : ""
                    }>(v${
                        bh.Version
                    })</span></span>\n</div>\n<div class="jai-hud-main-container active">\n\t<div class="jai-hud-scouter-player-container">\n\t\t<button class="bs-btn bs-btn-link bs-btn-xs jai-hud-toggle pull-right" data-action="toggle-player-scouter">[-]</button>\n\t\t<button class="bs-btn bs-btn-link bs-btn-xs jai-hud-toggle pull-right" data-action="refresh-player">${bh.getImg12(
                        "icons",
                        "glyphicons-82-refresh"
                    )}</button>\n\t\t<select id="jai-hud-scouter-player-target" data-change-action="toggle-scouter-player"></select>\n\t\t<div id="jai-hud-scouter-player-report" class="jai-hud-scouter-player-report active"></div>\n\t</div>\n\t<div class="jai-hud-inventory">\n\t\t<strong>Inventory</strong>\n\t\t<button class="bs-btn bs-btn-link bs-btn-xs" data-action="hud-to-library">[library]</button>\n\t\t${
                        location.href.includes("battlehand-hud") ? '<button class="bs-btn bs-btn-link bs-btn-xs" data-action="hud-to-local-library">[local library]</button>' : ""
                    }\n\t\t<button class="bs-btn bs-btn-link bs-btn-xs jai-hud-toggle pull-right" data-action="toggle-inventory">[-]</button>\n\t\t<div class="jai-hud-inventory-container active">\n\t\t\t<div class="text-center">\n\t\t\t\t<div class="bs-btn-group bs-btn-group-xs jai-hud-inventory-buttons text-center" role="group">\n\t\t\t\t\t${inventoryButton(
                        "element",
                        bh.ElementType.Air,
                        "elements",
                        "Air"
                    )}\n\t\t\t\t\t${inventoryButton("element", bh.ElementType.Earth, "elements", "Earth")}\n\t\t\t\t\t${inventoryButton("element", bh.ElementType.Fire, "elements", "Fire")}\n\t\t\t\t\t${inventoryButton(
                        "element",
                        bh.ElementType.Spirit,
                        "elements",
                        "Spirit"
                    )}\n\t\t\t\t\t${inventoryButton("element", bh.ElementType.Water, "elements", "Water")}\n\t\t\t\t\t${inventoryButton(
                        "element",
                        bh.ElementType.Neutral,
                        "elements",
                        "Loop"
                    )}\n\t\t\t\t</div>\n\t\t\t\t<div class="bs-btn-group bs-btn-group-xs jai-hud-inventory-buttons text-center">\n\t\t\t\t\t${inventoryButton("klass", bh.KlassType.Magic, "classes", "Magic")}\n\t\t\t\t\t${inventoryButton(
                        "klass",
                        bh.KlassType.Might,
                        "classes",
                        "Might"
                    )}\n\t\t\t\t\t${inventoryButton("klass", bh.KlassType.Skill, "classes", "Skill")}\n\t\t\t\t\t${inventoryButton("klass", "Brag", "cardtypes")}\n\t\t\t\t\t${inventoryButton(
                        "type",
                        bh.ItemType.Rune,
                        "runes",
                        "Meteor"
                    )}\n\t\t\t\t\t${inventoryButton(
                        "type",
                        bh.ItemType.Crystal,
                        "crystals",
                        "Neutral"
                    )}\n\t\t\t\t</div><br/>\n" + "\t\t\t\t<div class="bs-btn-group bs-btn-group-xs jai-hud-inventory-buttons text-center">\n" + 
                    "\t\t\t\t\t<button class="bs-btn bs-btn-default jai-hud-button" type="button" data-action="toggle-rarity" data-rarity="0">\n" + 
                    "\t\t\t\t\t<span class="evo-star">☆</span>\n" + 
                    "\t\t\t\t\t</button>\n" + 
                    "\t\t\t\t\t<button class="bs-btn bs-btn-default jai-hud-button" type="button" data-action="toggle-rarity" data-rarity="1">\n" + 
                    "\t\t\t\t\t<span class="evo-star">☆</span>\n" + 
                    "\t\t\t\t\t<span class="evo-star" style="position:relative;left:-5px;">☆</span>\n" + 
                    "\t\t\t\t\t</button>\n" + 
                    "\t\t\t\t\t<button class="bs-btn bs-btn-default jai-hud-button" type="button" data-action="toggle-rarity" data-rarity="2">\n" + 
                    "\t\t\t\t\t<span class="evo-star" style="position:relative;top:1px;">☆</span>\n" + 
                    "\t\t\t\t\t<span class="evo-star" style="position:relative;left:-5px;top:1px;">☆</span>\n" + 
                    "\t\t\t\t\t<span class="evo-star" style="position:relative;left:-23px;top:-3px;">☆</span>\n" + 
                    "\t\t\t\t\t</button>\n" + 
                    "\t\t\t\t\t<button class="bs-btn bs-btn-default jai-hud-button" type="button" data-action="toggle-rarity" data-rarity="3">\n" + 
                    "\t\t\t\t\t<span class="evo-star" style="position:relative;top:1px;">☆</span>\n" + 
                    "\t\t\t\t\t<span class="evo-star" style="position:relative;left:-5px;top:1px;">☆</span>\n" + 
                    "\t\t\t\t\t<span class="evo-star" style="position:relative;left:-18px;top:-3px;">☆</span>\n" + 
                    "\t\t\t\t\t<span class="evo-star" style="position:relative;left:-39px;top:-3px;">☆</span>\n" + 
                    "\t\t\t\t\t</button>\n" + 
                    "\t\t\t\t\t<button class="bs-btn bs-btn-default jai-hud-button" type="button" data-action="toggle-rarity" data-rarity="4">\n" + 
                    "\t\t\t\t\t<span class="evo-star" style="position:relative;top:2px;">☆</span>\n" + 
                    "\t\t\t\t\t<span class="evo-star" style="position:relative;left:-5px;top:2px;">☆</span>\n" + 
                    "\t\t\t\t\t<span class="evo-star" style="position:relative;left:-17px;top:-1px;">☆</span>\n" + 
                    "\t\t\t\t\t<span class="evo-star" style="position:relative;left:-40px;top:-1px;">☆</span>\n" + 
                    "\t\t\t\t\t<span class="evo-star" style="position:relative;left:-48px;top:-4px;">☆</span>\n" + 
                    "\t\t\t\t\t</button>\n" + 
                    "\t\t\t\t\t<button class="bs-btn bs-btn-default jai-hud-button" type="button" data-action="toggle-type" data-type="OtherInfo">?</button>\n" + 
                    "\t\t\t\t</div>\n" + 
                    "\t\t\t\t<div class="bs-btn-group bs-btn-group-xs jai-hud-inventory-buttons text-center">\n" + 
                    "\t\t\t\t\t${inventoryButton(
                        "type",
                        "BoosterCard",
                        "misc",
                        "Boosters"
                    )}\n\t\t\t\t\t${inventoryButton("type", "WildCard", "cardtypes", "WildCard")}\n\t\t\t\t\t${inventoryButton("type", bh.ItemType.EvoJar, "misc", "EvoJars")}\n\t\t\t\t\t${inventoryButton(
                        "type",
                        "CollectionCount",
                        "battlecards",
                        "BattleCard"
                    )}\n\t\t\t\t\t${inventoryButton(
                        "type",
                        "MonthlyReward",
                        "misc",
                        "Gift"
                    )}\n\t\t\t\t\t<button class="bs-btn bs-btn-default jai-hud-button" type="button" data-action="rr" data-count="10" style="display:none;background-color:#f2dede;color:#666;"><img src="./images/misc/Gift.png" style="visibility:hidden;"></button>\n\t\t\t\t</div>\n\t\t\t</div>\n\t\t</div>\n\t</div>\n</div>`;
                bh.$("body").append(`<div id="jai-hud-container" class="jai-hud-container">${html}</div>`);
            }
            (hud.WidthDefault = 275),
                (hud.WidthCurrent = +bh.utils.getFromStorage("BH-HUD-WidthCurrent") || hud.WidthDefault),
                (hud.WidthMinimum = 200),
                (hud.WidthDelta = 25),
                (hud.WidthCollapsed = 25),
                (hud.render = render),
                (hud.resize = resize),
                (hud.postResize = postResize);
        })((hud = bh.hud || (bh.hud = {})));
    })(bh || (bh = {})),
    (function (bh) {
        let hud;
        !(function (hud) {
            let scouter;
            !(function (scouter) {
                function getOrCreateContainer(guid) {
                    return (
                        bh.$(`div.jai-hud-scouter-player[data-guid="${guid}"]`).length || bh.$("div#jai-hud-scouter-player-report").append(`<div class="jai-hud-scouter-player" data-guid="${guid}"></div>`),
                        bh.$(`div.jai-hud-scouter-player[data-guid="${guid}"]`)
                    );
                }
                function formatScouterPowerRating(hero) {
                    let powerText = bh.utils.getFromStorage("BH-HUD-PowerText");
                    return "rating" === powerText
                        ? String(hero.powerRating)
                        : "percent" === powerText
                        ? hero.powerPercent + "%"
                        : "percent-rating" === powerText
                        ? `${hero.powerPercent}% (${hero.powerRating})`
                        : `${hero.powerRating} (${hero.powerPercent}%)`;
                }
                function loadPlayer(player, arenaIndex = -1) {
                    let meat = player.isFullMeat ? "&#9734;" : "",
                        brag = player.hasWarBragEquipped ? "" : "&oslash;",
                        percentText = player.isArena || player.isFullMeat ? "" : ` <span style="white-space:nowrap;">(${player.completionPercent}%)</span>`,
                        heroSorter,
                        powerToggler = '<span class="pull-right" data-action="toggle-power">#</span>',
                        html = `<div class="player-name">${'<span class="pull-left" data-action="sort-heroes">@</span>'} ${meat} ${player.htmlFriendlyName} ${percentText} ${brag} ${powerToggler}</div>`,
                        playerHeroes;
                    player.heroes.sort(bh.events.sortHeroesByTag).forEach((hero, hIndex) => {
                        if (!player.isMe && hero.isLocked) return;
                        let id = `${player.guid}-${hero.guid}`,
                            content = "",
                            title = "";
                        if (hero.isLocked) title = `<span class="hero-icon">${bh.getImg("misc", "Lock")}</span><span class="hero-name">${hero.name}</span>`;
                        else {
                            let powerThresholds = hero.hero.maxPowerThresholds,
                                powerRating = hero.powerRating,
                                threshold = powerRating <= powerThresholds[0] ? "easy" : powerRating <= powerThresholds[1] ? "medium" : powerRating <= powerThresholds[2] ? "hard" : powerRating <= powerThresholds[3] ? "harder" : "insane";
                            title =
                                `<span class="hero-icon">${bh.getImg("heroes", hero.name)}</span><span class="hero-name">${hero.name}</span>` +
                                `<span class="hero-level">${hero.level == bh.HeroRepo.MaxLevel ? (hero.isMeat ? '<span class="evo-star">&#9734;</span>' : '<span class="star">&#9734;</span>') : `(${hero.level})`}</span>` +
                                `<span class="hero-hp">${bh.utils.truncateNumber(hero.hitPoints)}</span>` +
                                `<span class="hero-rating-bar"><div class="progress-bar ${threshold} ${hero.hasOP ? "has-op" : ""}"><span class="hero-rating">${formatScouterPowerRating(hero)}</span></div></span>` +
                                `<span class="hero-effects" data-count="${hero.opEffects.length}">${hero.opEffects.map((e, i) => bh.EffectRepo.toScouterImage(e, i)).join("")}</span>`;
                        }
                        if (!hero.isLocked) {
                            //if (player.isMe || player.isAlly) {
                                let levelText = `${bh.getImg("heroes", hero.name)} ${hero.name} (${hero.level} / ${bh.HeroRepo.MaxLevel}${hero.isMaxed ? "; maxed" : hero.isCapped ? "; capped" : ""})`,
                                    level = hero.isMaxed ? `<div>${levelText}</div>` : bh.renderExpandable(hero.guid + "maxGold", levelText, hero.goldHtml, player.isMe),
                                    abilities = hero.playerHeroAbilities.map((playerHeroAbility) => {
                                        let cappedOrMaxed = playerHeroAbility.isMaxed ? "; maxed" : playerHeroAbility.isCapped ? "; capped" : "",
                                            levelText = playerHeroAbility.isLocked ? bh.getImg("misc", "Lock") : `(${playerHeroAbility.level} / ${playerHeroAbility.levelMax}${cappedOrMaxed})`,
                                            text = `${playerHeroAbility.img} ${playerHeroAbility.name} ${levelText}`,
                                            children = "";
                                        return playerHeroAbility.isMaxed || ((children += playerHeroAbility.materialHtml), (children += playerHeroAbility.goldHtml)), bh.renderExpandable(hero.guid + playerHeroAbility.guid, text, children, player.isMe);
                                    }),
                                    cardsHtml = hero.deck.map((card) => card.toHeroRowHtml(hero, player.isMe)).join("");
                                content = `${level}${abilities.join("")}${cardsHtml}`;
                            //}
                            //html += buildPanel(id, hero.elementType, title, content, player.isMe || player.isAlly);
                            html += buildPanel(id, hero.elementType, title, content, true);
                        }
                    }),
                        getOrCreateContainer(-1 == arenaIndex ? player.guid : "arena-" + arenaIndex).html(html),
                        hud.postResize();
                }
                function buildPanel(id, elementType, title, html, isMe) {
                    let header;
                    return `<div class="jai-hud-scouter-panel" data-guid="${id}"><div class="jai-hud-scouter-panel-header">${`<button class="bs-btn bs-btn-link bs-btn-sm ${bh.ElementType[elementType]}" ${
                        isMe ? 'data-action="toggle-scouter-hero"' : ""
                    }>${title}</button>`}</div><div class="jai-hud-scouter-panel-content">${html}</div></div>`;
                }
                (scouter.formatScouterPowerRating = formatScouterPowerRating), (scouter.loadPlayer = loadPlayer);
            })((scouter = hud.scouter || (hud.scouter = {})));
        })((hud = bh.hud || (bh.hud = {})));
    })(bh || (bh = {})),
    (function (bh) {
        let library;
        !(function (library) {
            let $ = window.jQuery,
                player = null,
                messenger,
                activeItem,
                activeCard;
            function sortCardsByRating() {
                $(".card-list tr")
                    .toArray()
                    .sort((a, b) => {
                        let A = +$(a).find(".card-rating").text().replace(",", ""),
                            B = +$(b).find(".card-rating").text().replace(",", "");
                        return A > B ? -1 : A < B ? 1 : 0;
                    })
                    .forEach((tr) => $(tr).parent().append(tr));
            }
            function cleanImageName(value) {
                return value.trim().replace(/\W/g, "");
            }
            function openLibraryFromHud(local = !1) {
                let host = local ? "." : bh.host;
                messenger = new bh.Messenger(window, handleLibraryMessage, window.open(host + "/", "bh-hud-library", "", !0));
            }
            function postMessage(action, data = null) {
                let message = bh.Messenger.createMessage(action, { action: action, data: data });
                (message.playerGuid = action), (message.sessionKey = action), messenger.postMessage(message);
            }
            function init() {
                let hud;
                location.search.includes("hud") ? ((messenger = new bh.Messenger(window, handleLibraryMessage, window.opener)), postMessage("library-requesting-player")) : _init();
            }
            function handleLibraryMessage(ev) {
                let message = ev.data || (ev.originalEvent && ev.originalEvent.data) || null;
                message && ("hud-sending-player" == message.action && message.data && ((player = new bh.Player(message.data)), _init()), "library-requesting-player" == message.action && postMessage("hud-sending-player", bh.Player.me._pp));
            }
            async function _init() {
                (bh.host = "https://bh.rasberik.com"),
                    await bh.data.init().then((data) => render(!1), initFailed),
                    $("body").on("click", '[data-action="show-card"]', onShowCard),
                    $("body").on("click", '[data-action="show-item"]', onShowItem),
                    $("body").on("click", "[data-search-term]", onSearchImage),
                    $("input.library-search").on("change keyup", onSearch),
                    $("button.library-search-clear").on("click", onSearchClear),
                    $("input[type='range']").on("change input", onSliderChange);
                let evoTabs = $("#card-evolution div.tab-pane"),
                    template = evoTabs.html();
                evoTabs
                    .html(template)
                    .toArray()
                    .forEach((div, i) =>
                        $(div)
                            .find("h3")
                            .text(`Evolution from ${i} to ${i + 1}`)
                    ),
                    bh.utils.ResizeManager.startListening();
            }
            function onSearchImage(ev) {
                let el,
                    newValue = $(ev.target).closest("[data-search-term]").attr("data-search-term"),
                    lowerValue = newValue.toLowerCase(),
                    input = $("input.library-search"),
                    currentValue = input.val(),
                    lowerValues;
                currentValue.trim().toLowerCase().split(/\s+/).includes(lowerValue) ||
                    (input
                        .focus()
                        .val((currentValue + " " + newValue).trim())
                        .blur(),
                    performSearch((currentValue + " " + newValue).trim().toLowerCase()));
            }
            function onSearchClear() {
                (searching = null),
                    $("input.library-search").val(""),
                    $('a[href="#card-table"] > span.badge').text(String(bh.data.BattleCardRepo.length)),
                    $('a[href="#effect-table"] > span.badge').text(String(bh.data.EffectRepo.length)),
                    $('a[href="#item-table"] > span.badge').text(String(bh.data.ItemRepo.length)),
                    $("tbody > tr[id]").show();
            }
            function onSliderChange(ev) {
                let evo = +$("#card-slider-evo").val(),
                    level = $("#card-slider-level").val(),
                    action = $(ev.target).closest("input[data-action]").data("action");
                $("#card-slider-types").html(
                    `<span style="padding-left:25px;">${evo}.${level.substr(-2)}</span><br/>` +
                        activeCard.typesTargets.map((type, typeIndex) => bh.getImg20("cardtypes", type.split(" ")[0].replace("Damage", "Attack")) + ` ${type} (${bh.utils.formatNumber(getValue(typeIndex, evo, +level))})`).join("<br/>")
                );
            }
            function getValue(typeIndex, evolutionLevel, level) {
                let playerCard = { configId: activeCard.guid, evolutionLevel: evolutionLevel, level: level - 1 };
                return bh.BattleCardRepo.calculateValue(playerCard, typeIndex);
            }
            function getMinValue(typeIndex) {
                return getValue(typeIndex, 0, 0);
            }
            function getMaxValue(typeIndex) {
                let maxEvo, maxLevel;
                return getValue(typeIndex, activeCard.rarityType + 1, bh.BattleCardRepo.getLevelsForRarity(activeCard.rarityType) - 1);
            }
            function onShowItem(ev) {
                let link,
                    tr,
                    guid = $(ev.target).closest("tr").attr("id"),
                    item = bh.data.ItemRepo.find(guid);
                (activeItem = item),
                    $("div.modal-item").modal("show"),
                    $("#item-name").html(item.name + " &nbsp; " + mapMatsToImages([item.name]).join(" ")),
                    $("#item-rarity").html(bh.utils.evoToStars(item.rarityType) + " " + bh.RarityType[item.rarityType]),
                    $("#item-element").html(bh.ElementRepo.toImage(item.elementType) + " " + bh.ElementType[item.elementType]);
                let html = bh.data.DungeonRepo.getDropRates(item.name)
                    .map((dropRate) => `<tr><td>${dropRate.dungeon.name}</td><td>${dropRate.dungeon.keys} keys</td><td>${Math.round(1e3 * dropRate.dropRate.averagePerKey) / 10}% / key</td></tr>`)
                    .join("");
                $("#item-dungeons").html(`<table class="table table-striped table-condensed"><tbody>${html}</tbody></table>`);
            }
            function onShowCard(ev) {
                let link,
                    tr,
                    guid = $(ev.target).closest("tr").attr("id"),
                    card = bh.data.BattleCardRepo.find(guid);
                (activeCard = card),
                    $("div.modal-card").modal("show"),
                    $("#card-name").html(card.name + " &nbsp; " + mapHeroesToImages(card).join(" ")),
                    $("#card-image").attr("src", bh.getSrc("battlecards", "blank", cleanImageName(card.name))),
                    $("#card-element").html(bh.ElementRepo.toImage(card.elementType) + " " + bh.ElementType[card.elementType]),
                    $("#card-klass").html(bh.KlassRepo.toImage(card.klassType) + " " + bh.KlassType[card.klassType]),
                    $("#card-klass").removeClass("Magic Might Skill").addClass(bh.KlassType[card.klassType]),
                    $("#card-rarity").html(bh.utils.evoToStars(card.rarityType) + " " + bh.RarityType[card.rarityType]),
                    $("#card-types").html(
                        card.typesTargets
                            .map(
                                (type, typeIndex) =>
                                    bh.getImg20("cardtypes", type.split(" ")[0].replace("Damage", "Attack")) +
                                    ` ${type.split(" ")[0].replace("Damage", "Attack")} (${bh.utils.formatNumber(getMinValue(typeIndex))} - ${bh.utils.formatNumber(getMaxValue(typeIndex))})`
                            )
                            .join("<br/>")
                    ),
                    $("#card-turns").html(String(card.turns)),
                    $("div.panel-card span.card-brag").html(String(card.brag)),
                    $("div.panel-card span.card-min").html(card.minValues.map((v) => v.join()).join(" :: ")),
                    $("div.panel-card span.card-max").html(card.maxValues.join(" :: ")),
                    $("div.panel-card span.card-mats").html(card.mats.join()),
                    $("#card-targets").html(
                        bh.EffectRepo.mapTargets(card)
                            .map((target) => bh.EffectRepo.toImage(target) + " " + target.name + "<br/>")
                            .join("")
                    ),
                    $("#card-effects").html(
                        bh.EffectRepo.mapEffects(card)
                            .map((effect) => bh.EffectRepo.toImage(effect) + " " + effect.name + "<br/>")
                            .join("")
                    ),
                    $("#card-perks").html(
                        bh.EffectRepo.mapPerks(card)
                            .map((perk) => bh.EffectRepo.toImage(perk) + " " + perk.name)
                            .join("<br/>")
                    ),
                    $("div.panel-card span.card-perk").html(card.perkBase + "%"),
                    $("#card-mats").html(
                        card.mats
                            .map((mat) => bh.data.ItemRepo.find(mat))
                            .map((mat) => bh.ItemRepo.toImage(mat) + " " + mat.name)
                            .join("<br/>")
                    );
                let recipe = new bh.Recipe(card),
                    minGold = 0,
                    maxGold = 0,
                    tabs = $("#card-evolution > ul.nav > li").toArray();
                [0, 1, 2, 3, 4].forEach((index) => {
                    let evo = recipe.evos[index],
                        target = `#evo-${index}-${index + 1}`,
                        tab = $(tabs[index]).removeClass("disabled");
                    if (!evo) return $(`${target} tbody`).html(""), void tab.addClass("disabled");
                    let html = "",
                        minGp = bh.data.getMinGoldNeeded(card.rarityType, evo.evoFrom),
                        maxGp = bh.data.getMaxGoldNeeded(card.rarityType, evo.evoFrom);
                    if (
                        ((minGold += minGp),
                        (maxGold += maxGp),
                        (html += evoRow(bh.getImg("misc", "Coin"), "Gold", minGp, maxGp)),
                        evo.items.filter((item) => !!item.max).forEach((item) => (html += evoRow(bh.getImg20("evojars", cleanImageName(item.item.name)), item.item.name, item.min, item.max))),
                        5 == evo.evoTo)
                    )
                        if (card.elementType != bh.ElementType.Neutral) {
                            let crystal = bh.data.ItemRepo.crystals.find((item) => item.elementType == card.elementType),
                                hero = bh.data.HeroRepo.all.find((hero) => hero.elementType == card.elementType && hero.klassType == card.klassType),
                                rune = hero && bh.data.ItemRepo.runes.find((item) => item.name.startsWith(hero.name));
                            (html += evoRow(bh.getImg20("crystals", bh.ElementType[card.elementType]), crystal.name, bh.data.getMinCrystalsNeeded(card.rarityType, evo.evoFrom), bh.data.getMaxCrystalsNeeded(card.rarityType, evo.evoFrom))),
                                (html += evoRow(bh.getImg20("runes", cleanImageName(hero.trait.name)), rune.name, bh.data.getMinRunesNeeded(card.rarityType, evo.evoFrom), bh.data.getMaxRunesNeeded(card.rarityType, evo.evoFrom)));
                        } else (html += evoRow(bh.getImg20("evojars", cleanImageName("Sands of Time")), "Sands of Time", 40, 60)), (html += evoRow(bh.getImg20("evojars", cleanImageName("Strength Stone")), "Strength Stone", 40, 60));
                    $(`${target} tbody`).html(html);
                });
                let allTBody = $("#evo-all tbody").html("");
                if (
                    (allTBody.append(evoRow(bh.getImg("misc", "Coin"), "Gold", minGold, maxGold)),
                    recipe.all.forEach((item) => {
                        allTBody.append(evoRow(bh.getImg20("evojars", cleanImageName(item.item.name)), item.item.name, item.min, item.max));
                    }),
                    card.rarityType == bh.RarityType.Legendary)
                )
                    if (card.elementType != bh.ElementType.Neutral) {
                        let crystal = bh.data.ItemRepo.crystals.find((item) => item.elementType == card.elementType),
                            hero = bh.data.HeroRepo.all.find((hero) => hero.elementType == card.elementType && hero.klassType == card.klassType),
                            rune = bh.data.ItemRepo.runes.find((item) => item.name.startsWith(hero.name));
                        allTBody.append(evoRow(bh.getImg20("crystals", bh.ElementType[card.elementType]), crystal.name, bh.data.getMinCrystalsNeeded(card.rarityType, 0), bh.data.getMaxCrystalsNeeded(card.rarityType, 4))),
                            allTBody.append(evoRow(bh.getImg20("runes", cleanImageName(hero.trait.name)), rune.name, bh.data.getMinRunesNeeded(card.rarityType, 0), bh.data.getMaxRunesNeeded(card.rarityType, 4)));
                    } else
                        allTBody.append(evoRow(bh.getImg20("evojars", cleanImageName("Sands of Time")), "Sands of Time", 40, 60)), allTBody.append(evoRow(bh.getImg20("evojars", cleanImageName("Strength Stone")), "Strength Stone", 40, 60));
                $("#card-evolution .active").removeClass("active"),
                    $("#card-evolution > ul.nav > li").first().addClass("active"),
                    $("#card-evolution > div.tab-content > div.tab-pane").first().addClass("active"),
                    $("#card-slider-evo")
                        .val(0)
                        .attr("max", card.rarityType + 1),
                    $("#card-slider-evo-labels-table tbody").html(
                        new Array(card.rarityType + 2)
                            .fill(1)
                            .map((_, evo) => `<td class="text-${evo ? (evo == card.rarityType + 1 ? "right" : "center") : "left"}">${evo}</td>`)
                            .join("")
                    );
                let levelsForRarity = bh.BattleCardRepo.getLevelsForRarity(card.rarityType),
                    levelSliderLevels = 10 == levelsForRarity ? [1, 5, 10] : 20 == levelsForRarity ? [1, 5, 10, 15, 20] : 35 == levelsForRarity ? [1, 5, 10, 15, 20, 25, 30, 35] : [1, 10, 20, 30, 40, 50];
                $("#card-slider-level").val(1).attr("max", levelsForRarity),
                    $("#card-slider-level-labels-table tbody").html(levelSliderLevels.map((level, index) => `<td class="text-${index ? (index == levelSliderLevels.length - 1 ? "right" : "center") : "left"}">${level}</td>`).join("")),
                    $("#card-slider-types").html(
                        '<span style="padding-left:25px;">0.01</span><br/>' +
                            card.typesTargets.map((type, typeIndex) => bh.getImg20("cardtypes", type.split(" ")[0].replace("Damage", "Attack")) + ` ${type} (${bh.utils.formatNumber(getMinValue(typeIndex))})`).join("<br/>")
                    );
            }
            function evoRow(image, name, min, max) {
                return `<tr><td class="icon">${image}</td><td class="name">${name}</td><td class="min">${bh.utils.formatNumber(min)}</td><td class="max">${bh.utils.formatNumber(max)}</td></tr>`;
            }
            (library.sortCardsByRating = sortCardsByRating), (library.openLibraryFromHud = openLibraryFromHud), (library.init = init), (library.handleLibraryMessage = handleLibraryMessage);
            let filtered = { card: {}, effect: {}, item: {}, dungeon: {} },
                searching,
                searchTimeout;
            function onSearch(ev) {
                searchTimeout && clearTimeout(searchTimeout),
                    (searchTimeout = setTimeout(() => {
                        performSearch($(ev.target).val().trim().toLowerCase());
                    }, 500));
            }
            function performSearch(lower) {
                if (!lower) return onSearchClear();
                (searching = lower),
                    ["card", "effect", "item", "dungeon"].forEach((which) =>
                        setTimeout(
                            (lower) => {
                                matchAndToggle(which, lower);
                            },
                            0,
                            lower
                        )
                    );
            }
            function getAll(which) {
                switch (which) {
                    case "card":
                        return bh.data.BattleCardRepo.all;
                    case "effect":
                        return bh.data.EffectRepo.all;
                    case "item":
                        return bh.data.ItemRepo.all;
                    case "dungeon":
                        return bh.data.DungeonRepo.all;
                    default:
                        return [];
                }
            }
            let tests = {};
            function setCardTests(card) {
                if (!card) return [];
                if (!tests[card.guid]) {
                    let list = (tests[card.guid] = []);
                    card.brag && list.push("brag"),
                        card.effects.forEach((s) => list.push(s.toLowerCase().replace(/shield break(er)?/, "crush"))),
                        list.push(bh.ElementType[card.elementType].toLowerCase()),
                        list.push(bh.KlassType[card.klassType].toLowerCase()),
                        list.push(card.lower),
                        card.mats.forEach((s) => list.push(s.toLowerCase())),
                        card.perks.forEach((s) => list.push(s.toLowerCase())),
                        list.push(bh.RarityType[card.rarityType].toLowerCase()),
                        list.push(String(card.turns)),
                        card.typesTargets.forEach((s) => list.push(s.toLowerCase().split(" (")[0])),
                        bh.data.HeroRepo.all.filter((hero) => hero.klassType == card.klassType && (card.elementType == bh.ElementType.Neutral || hero.elementType == card.elementType)).forEach((hero) => list.push(hero.lower)),
                        player && list.push(player.battleCards.find((playerBattleCard) => playerBattleCard.guid == card.guid) ? "have" : "need");
                }
                return tests[card.guid] || [];
            }
            function setEffectTests(effect) {
                if (!tests[effect.guid]) {
                    let list = (tests[effect.guid] = []);
                    list.push(effect.description.toLowerCase()), list.push(effect.lower);
                }
                return tests[effect.guid] || [];
            }
            function setItemTests(item) {
                if (!tests[item.guid]) {
                    let list = (tests[item.guid] = []);
                    list.push(bh.ElementType[item.elementType].toLowerCase()), list.push(bh.ItemType[item.itemType].toLowerCase()), list.push(item.lower), list.push(bh.RarityType[item.rarityType].toLowerCase());
                }
                return tests[item.guid] || [];
            }
            function setDungeonTests(dungeon) {
                if (!tests[dungeon.guid]) {
                    let list = (tests[dungeon.guid] = []);
                    list.push(dungeon.lower), dungeon.mats.forEach((s) => list.push(s.name.toLowerCase()));
                }
                return tests[dungeon.guid] || [];
            }
            let elementLowers = bh.ElementRepo.allTypes.map((type) => bh.ElementType[type].toLowerCase()),
                rarityLowers = bh.RarityRepo.allTypes.map((type) => bh.RarityType[type].toLowerCase()),
                heroNameLowers = null;
            function matchTests(which, tests, word) {
                return "effect" == which
                    ? matchTestsIncludes(tests, word)
                    : (heroNameLowers || (heroNameLowers = bh.data.HeroRepo.all.map((hero) => hero.lower)),
                      elementLowers.includes(word) || rarityLowers.includes(word) || heroNameLowers.includes(word) ? matchTestsEquals(tests, word) : matchTestsIncludes(tests, word));
            }
            function matchTestsEquals(tests, word) {
                return tests.find((test) => test == word);
            }
            function matchTestsIncludes(tests, word) {
                return tests.find((test) => test.includes(word));
            }
            function matchAndToggle(which, search) {
                if (!filtered[which][search]) {
                    let words = search.split(/\s+/);
                    filtered[which][search] = getAll(which)
                        .filter((item) => !words.find((word) => !matchTests(which, tests[item.guid] || [], word)))
                        .map((item) => item.guid);
                }
                let badge = $(`a[href="#${which}-table"] > span.badge`),
                    show = filtered[which][search] || [],
                    hide = getAll(which)
                        .map((item) => item.guid)
                        .filter((guid) => !show.includes(guid));
                search == searching && ($("#" + show.join(",#")).show(), $("#" + hide.join(",#")).hide(), badge.text(String(show.length)));
            }
            function mapPerksEffects(card) {
                let list = [];
                return (
                    bh.EffectRepo.mapTargets(card).forEach((target) => (list.includes(target) ? void 0 : list.push(target))),
                    bh.EffectRepo.mapEffects(card).forEach((effect) => (list.includes(effect) ? void 0 : list.push(effect))),
                    bh.EffectRepo.mapPerks(card).forEach((perk) => (list.includes(perk) ? void 0 : list.push(perk))),
                    list.reduce((out, item) => (["Self", "Single"].includes(item.name) ? out : out.concat([item])), [])
                );
            }
            function cleanPerkEffectSearchTerm(term) {
                return term.replace("Splash Damage", "Splash").replace("Multi-Target (Ally)", "Multi").replace("Multi-Target (Enemy)", "Multi");
            }
            function mapPerksEffectsToImages(card) {
                return mapPerksEffects(card).map((item) => renderIcon(item.guid, cleanPerkEffectSearchTerm(item.name), `${item.name}: ${item.description}`));
            }
            function mapMatsToImages(mats) {
                return mats
                    .map((mat) => bh.data.ItemRepo.find(mat))
                    .filter((item) => item)
                    .map((item) =>
                        renderIcon(
                            item.guid,
                            item.name,
                            `${item.name}: ${bh.RarityType[item.rarityType]} ${bh.ElementType[item.elementType]} ${bh.ItemType[item.itemType]} (${bh.utils.formatNumber(bh.ItemRepo.getValue(item.itemType, item.rarityType))} gold)`
                        )
                    );
            }
            function mapHeroesToImages(card) {
                return bh.data.HeroRepo.all
                    .filter((hero) => (card.elementType == bh.ElementType.Neutral || hero.elementType == card.elementType) && hero.klassType == card.klassType)
                    .map((hero) => renderIcon(hero.guid, hero.name, `${hero.name}: ${bh.ElementType[hero.elementType]} ${bh.KlassType[hero.klassType]} Hero`));
            }
            function mapRarityToStars(rarityType) {
                return `<span class="stars" title="${bh.RarityType[rarityType]}" data-toggle="tooltip" data-placement="top">${bh.utils.evoToStars(rarityType)}</span>`;
            }
            function initFailed(reason) {
                console.warn("Library failed to render due to failed 'data.init()'."), console.error(reason), $("div.row.alert-row .alert").toggleClass("hidden");
            }
            function render(failed, failReason) {
                bh.css.addCardTypes($),
                    bh.css.addEffects($),
                    bh.css.addElements($),
                    bh.css.addHeroes($),
                    bh.css.addItems($),
                    bh.css.addKlasses($),
                    renderEffects(),
                    renderItems(),
                    renderCards(),
                    renderDungeons(),
                    $("div.row.alert-row").remove(),
                    $("div.row.table-row").show(),
                    $('[data-toggle="tooltip"]').tooltip();
            }
            function renderIcon(guid, term = guid, title = term, hiddenXs = !1) {
                return `<div class="${hiddenXs ? "hidden-xs" : ""} bh-hud-image img-${guid}" title="${title}" data-toggle="tooltip" data-placement="top" data-search-term="${term}"></div>`;
            }
            function renderCards(sortByPower = location.search.includes("sortByPower")) {
                let complete = location.search.includes("complete"),
                    cards = bh.data.BattleCardRepo.all;
                sortByPower && bh.PowerRating.sortCardsByPowerRating(cards), $('a[href="#card-table"] > span.badge').text(String(cards.length));
                let tbody = $("table.card-list > tbody").empty();
                cards.forEach((card) => {
                    if (!card) return;
                    setCardTests(card);
                    let owned = player && player.battleCards.find((bc) => card.guid == bc.guid),
                        html = `<tr id="${card.guid}">`;
                    player &&
                        (html += `<td><span class="card-owned glyphicon ${owned ? "glyphicon-ok text-success" : "glyphicon-remove text-danger"}" title="${owned ? "Have" : "Need"}" data-toggle="tooltip" data-placement="top"></span></td>`),
                        (html += `<td><div class="bh-hud-image img-${card.brag ? "Brag" : "BattleCard"}" title="${card.brag ? "Brag" : "BattleCard"}" data-toggle="tooltip" data-placement="top"></div></td>`),
                        (html += `<td><span class="card-name"><a class="btn btn-link" data-action="show-card" style="padding:0;">${card.name}</a></span></td>`),
                        (html += `<td class="text-center"><span class="card-rating">${bh.utils.formatNumber(bh.PowerRating.rateBattleCard(card, bh.MinMaxType.Max, null))}</span></td>`),
                        complete && (html += `<td class="text-center" data-search-term="${bh.RarityType[card.rarityType]}">${mapRarityToStars(card.rarityType)}</td>`),
                        complete && (html += `<td>${renderIcon(bh.ElementType[card.elementType])}</td>`),
                        complete && (html += `<td>${renderIcon(bh.KlassType[card.klassType], void 0, void 0, !0)}</td>`),
                        (html += `<td>${mapHeroesToImages(card).join("")}</td>`),
                        complete && (html += `<td class="hidden-xs">${mapPerksEffectsToImages(card).join("")}</td>`),
                        complete && (html += `<td class="hidden-xs">${mapMatsToImages(card.mats).join("")}</td>`),
                        (html += '<td class="hidden-xs" style="width:100%;"></td>'),
                        (html += "</td></tr>"),
                        tbody.append(html);
                });
            }
            function renderEffects() {
                let effects = bh.data.EffectRepo.all;
                $('a[href="#effect-table"] > span.badge').text(String(effects.length));
                let tbody = $("table.effect-list > tbody");
                effects.forEach((effect) => {
                    setEffectTests(effect);
                    let html = `<tr id="${effect.guid}">`;
                    (html += `<td><div class="bh-hud-image img-${effect.guid}"></div></td>`),
                        (html += `<td><span class="card-name">${effect.name}</span><div class="visible-xs-block" style="border-top:1px dotted #666;">${effect.description}</div></td>`),
                        (html += `<td class="hidden-xs" style="width:100%;"><span class="card-description">${effect.description}</span></td>`),
                        (html += "</td></tr>"),
                        tbody.append(html);
                });
            }
            function renderItems() {
                let items = bh.data.ItemRepo.all;
                $('a[href="#item-table"] > span.badge').text(String(items.length));
                let tbody = $("table.mat-list > tbody");
                items.forEach((item) => {
                    let owned = player && player.inventory.find((playerInventoryItem) => playerInventoryItem.guid == item.guid);
                    setItemTests(item);
                    let html = `<tr id="${item.guid}">`;
                    (html += `<td><div class="bh-hud-image img-${item.guid}"></div></td>`),
                        (html += `<td><span class="card-name"><a class="btn btn-link" data-action="show-item" style="padding:0;">${item.name}</a></span></td>`),
                        (html += `<td>${mapRarityToStars(item.rarityType)}</td>`),
                        player && (html += `<td><span class="badge">${bh.utils.formatNumber((owned && owned.count) || 0)}</span></td>`),
                        (html += '<td class="hidden-xs" style="width:100%;"></td>'),
                        (html += "</td></tr>"),
                        tbody.append(html);
                });
            }
            function renderDungeons() {
                let dungeons = bh.data.DungeonRepo.all;
                $('a[href="#dungeon-table"] > span.badge').text(String(dungeons.length));
                let tbody = $("table.dungeon-list > tbody");
                dungeons.forEach((dungeon) => {
                    setDungeonTests(dungeon);
                    let html = `<tr id="${dungeon.guid}">`;
                    (html += `<td><span class="">${dungeon.name}</span></td>`),
                        (html += `<td><span class="">${bh.getImg20("keys", "SilverKey")} ${dungeon.keys}</span></td>`),
                        (html += `<td><span class="">${bh.getImg20("misc", "Fame")} ${bh.utils.formatNumber(dungeon.fame)}</span></td>`),
                        (html += `<td><span class="">${bh.getImg20("keys", "RaidTicket")}</span></td>`),
                        (html += `<td><span class="">${bh.getImg20("misc", "Coin")} ${bh.utils.formatNumber(dungeon.gold)} <small>(${bh.utils.formatNumber(Math.round(dungeon.gold / dungeon.keys))} / key)</small></span></td>`);
                    try {
                        (html += `<td><span class="">${dungeon.elementTypes.map((elementType) => `<div class="bh-hud-image img-${bh.ElementType[elementType]}"></div>`).join("")}</span></td>`),
                            (html += "<td/>"),
                            (html += "<td/>"),
                            (html += `<td><span>${mapMatsToImages(dungeon.mats.map((m) => m.name)).join("")}</span></td>`),
                            (html += `<td><span class="">${dungeon.randomMats.map((count, rarityType) => (count ? bh.getImg20("evojars", "random", `${bh.RarityType[rarityType]}_Neutral_Small`) + count : "")).join(" ")}</span></td>`);
                    } catch (ex) {
                        console.error(ex);
                    }
                    (html += '<td class="hidden-xs" style="width:100%;"></td>'), (html += "</td></tr>"), tbody.append(html);
                });
            }
            library.renderCards = renderCards;
        })((library = bh.library || (bh.library = {})));
    })(bh || (bh = {}));
class XmlHttpRequest {
    constructor() {
        (this.eventListeners = []), (this.requestHeaders = []), (this.responseFilter = null);
        let original = XmlHttpRequest.original || XMLHttpRequest;
        (this.xmlHttpRequest = new original()),
            XmlHttpRequest.globalListeners.forEach((args) => {
                try {
                    let sliced = args.slice(),
                        fn = sliced[1];
                    (sliced[1] = (...evArgs) => {
                        try {
                            fn.apply(this, evArgs);
                        } catch (e) {
                            console.error("XmlHttpRequest: Firing Global EventListener", e);
                        }
                    }),
                        this.addEventListener.apply(this, sliced);
                } catch (ex) {
                    console.error("XmlHttpRequest: Adding Global EventListeners", ex);
                }
            });
    }
    get async() {
        return this.openArgs && "boolean" == typeof this.openArgs[2] ? this.openArgs[2] : void 0;
    }
    get method() {
        return (this.openArgs && this.openArgs[0]) || void 0;
    }
    get onabort() {
        return this.xmlHttpRequest.onabort;
    }
    set onabort(fn) {
        this.xmlHttpRequest.onabort = fn;
    }
    get onerror() {
        return this.xmlHttpRequest.onerror;
    }
    set onerror(fn) {
        this.xmlHttpRequest.onerror = fn;
    }
    get onload() {
        return this.xmlHttpRequest.onload;
    }
    set onload(fn) {
        this.xmlHttpRequest.onload = fn;
    }
    get onloadend() {
        return this.xmlHttpRequest.onloadend;
    }
    set onloadend(fn) {
        this.xmlHttpRequest.onloadend = fn;
    }
    get onloadstart() {
        return this.xmlHttpRequest.onloadstart;
    }
    set onloadstart(fn) {
        this.xmlHttpRequest.onloadstart = fn;
    }
    get onreadystatechange() {
        return this.xmlHttpRequest.onreadystatechange;
    }
    set onreadystatechange(fn) {
        this.xmlHttpRequest.onreadystatechange = fn;
    }
    get onprogress() {
        return this.xmlHttpRequest.onprogress;
    }
    set onprogress(fn) {
        this.xmlHttpRequest.onprogress = fn;
    }
    get ontimeout() {
        return this.xmlHttpRequest.ontimeout;
    }
    set ontimeout(fn) {
        this.xmlHttpRequest.ontimeout = fn;
    }
    get password() {
        return this.openArgs && "string" == typeof this.openArgs[4] ? this.openArgs[4] : void 0;
    }
    get readyState() {
        return this.xmlHttpRequest.readyState;
    }
    get requestJSON() {
        try {
            return JSON.parse(XmlHttpRequest.isUintArray(this.sendData) ? XmlHttpRequest.uintArrayToString(this.sendData) : String(this.sendData));
        } catch (ex) {
            console.error(`XmlHttpRequest.requestJSON(${typeof this.sendData})`, this.sendData);
        }
    }
    get requestUrl() {
        return (this.openArgs && this.openArgs[1]) || void 0;
    }
    get response() {
        return this.xmlHttpRequest.response;
    }
    get responseJSON() {
        if ("json" == this.responseType) return this.xmlHttpRequest.response;
        try {
            return JSON.parse(this.responseText);
        } catch (ex) {
            console.error("XmlHttpRequest.responseJSON", ex);
        }
    }
    get responseText() {
        let responseType = this.responseType;
        if ("arraybuffer" == responseType) {
            let contentType = this.getResponseHeader("Content-Type"),
                uaConstructor = contentType.match(/UTF\-32/i) ? Uint32Array : contentType.match(/UTF\-16/i) ? Uint16Array : Uint8Array;
            return XmlHttpRequest.arrayBufferToString(this.xmlHttpRequest.response, uaConstructor);
        }
        return "json" == responseType ? JSON.stringify(this.xmlHttpRequest.response) : this.xmlHttpRequest.responseText;
    }
    get responseType() {
        return this.xmlHttpRequest.responseType;
    }
    set responseType(type) {
        this.xmlHttpRequest.responseType = type;
    }
    get responseXML() {
        return this.xmlHttpRequest.responseXML;
    }
    get status() {
        return this.xmlHttpRequest.status;
    }
    get statusText() {
        return this.xmlHttpRequest.statusText;
    }
    get timeout() {
        return this.xmlHttpRequest.timeout;
    }
    set timeout(value) {
        this.xmlHttpRequest.timeout = value;
    }
    get upload() {
        return this.xmlHttpRequest.upload;
    }
    get user() {
        return this.openArgs && "string" == typeof this.openArgs[3] ? this.openArgs[3] : void 0;
    }
    get withCredentials() {
        return this.xmlHttpRequest.withCredentials;
    }
    set withCredentials(value) {
        this.xmlHttpRequest.withCredentials = value;
    }
    resend() {
        return new Promise((resolve, reject) => {
            try {
                let xhr = new XmlHttpRequest();
                (xhr.onabort = this.onabort),
                    (xhr.onerror = this.onerror),
                    (xhr.onload = this.onload),
                    (xhr.onloadend = this.onloadend),
                    (xhr.onloadstart = this.onloadstart),
                    (xhr.onreadystatechange = this.onreadystatechange),
                    (xhr.onprogress = this.onprogress),
                    (xhr.ontimeout = this.ontimeout),
                    (xhr.responseFilter = this.responseFilter),
                    (xhr.responseType = this.responseType),
                    (xhr.timeout = this.timeout),
                    (xhr.withCredentials = this.withCredentials),
                    this.eventListeners.forEach((args) => xhr.addEventListener(...args)),
                    xhr.addEventListener("readystatechange", () => {
                        xhr.readyState === XmlHttpRequest.DONE && setTimeout(() => resolve(xhr), 500);
                    }),
                    this.mimeType && this.overrideMimeType(this.mimeType),
                    xhr.open(...this.openArgs),
                    this.requestHeaders.forEach((rh) => xhr.setRequestHeader(rh.header, rh.value)),
                    xhr.send(XmlHttpRequest.cloneData(this.sendData));
            } catch (ex) {
                console.error(ex), reject(ex);
            }
        });
    }
    abort() {
        this.xmlHttpRequest.abort();
    }
    addEventListener(...args) {
        this.eventListeners.push(args), this.xmlHttpRequest.addEventListener.apply(this.xmlHttpRequest, args);
    }
    getAllResponseHeaders() {
        return this.xmlHttpRequest.getAllResponseHeaders();
    }
    getResponseHeader(header) {
        return this.xmlHttpRequest.getResponseHeader(header);
    }
    open(...args) {
        (this.openArgs = args), this.xmlHttpRequest.open.apply(this.xmlHttpRequest, args);
    }
    overrideMimeType(mime) {
        (this.mimeType = mime), this.xmlHttpRequest.overrideMimeType(mime);
    }
    send(data) {
        (this.sendData = data), this.xmlHttpRequest.send(data);
    }
    setRequestHeader(header, value) {
        this.requestHeaders.push({ header: header, value: value }), this.xmlHttpRequest.setRequestHeader(header, value);
    }
    static addEventListener(...args) {
        XmlHttpRequest.globalListeners.push(args);
    }
    static attach(win, listener) {
        (XmlHttpRequest.original = win.XMLHttpRequest), (win.XMLHttpRequest = XmlHttpRequest), listener && XmlHttpRequest.addEventListener("readystatechange", listener);
    }
    static isUintArray(data) {
        return data instanceof Uint8Array || data instanceof Uint16Array || data instanceof Uint32Array;
    }
    static cloneData(data) {
        return XmlHttpRequest.isUintArray ? new data.constructor(data) : data;
    }
    static uintArrayToString(uintArray) {
        try {
            let CHUNK_SZ = 32768,
                characters = [];
            for (let i = 0, l = uintArray.length; i < l; i += CHUNK_SZ) characters.push(String.fromCharCode.apply(null, uintArray.subarray(i, i + CHUNK_SZ)));
            return decodeURIComponent(escape(characters.join("")));
        } catch (ex) {
            console.error("XmlHttpRequest.uintArrayToString", ex);
        }
    }
    static stringToUintArray(string, uintArrayConstructor) {
        try {
            let encoded,
                charList = unescape(encodeURIComponent(string)).split(""),
                uintArray = [];
            for (let i = charList.length; i--; ) uintArray[i] = charList[i].charCodeAt(0);
            return new uintArrayConstructor(uintArray);
        } catch (ex) {
            console.error("XmlHttpRequest.stringToUintArray", ex);
        }
    }
    static arrayBufferToString(arrayBuffer, uintArrayConstructor) {
        try {
            let uintArray = new uintArrayConstructor(arrayBuffer);
            return XmlHttpRequest.uintArrayToString(uintArray);
        } catch (ex) {
            console.error("XmlHttpRequest.arrayBufferToString", ex);
        }
        return null;
    }
    static get(url) {
        return new Promise((res, rej) => {
            let xhr = new XmlHttpRequest();
            xhr.addEventListener("readystatechange", () => {
                xhr.readyState == XmlHttpRequest.DONE && res(xhr.responseText);
            }),
                xhr.open("GET", url, !0),
                xhr.send(null);
        });
    }
    static getJSON(url) {
        return new Promise((res, rej) => {
            let xhr = new XmlHttpRequest();
            xhr.addEventListener("readystatechange", () => {
                xhr.readyState == XmlHttpRequest.DONE && res(xhr.responseJSON);
            }),
                xhr.open("GET", url, !0),
                xhr.send(null);
        });
    }
    static post(url, data, contentType) {
        return new Promise((res, rej) => {
            let xhr = new XmlHttpRequest();
            xhr.addEventListener("readystatechange", () => {
                xhr.readyState == XmlHttpRequest.DONE && res(xhr);
            }),
                xhr.open("POST", url, !0),
                contentType && xhr.setRequestHeader("Content-Type", contentType),
                xhr.send(data);
        });
    }
    static digestToHex(buffer) {
        const byteArray = new Uint8Array(buffer),
            hexCodes = [...byteArray].map((value) => {
                const hexCode = value.toString(16),
                    paddedHexCode = hexCode.padStart(2, "0");
                return paddedHexCode;
            });
        return hexCodes.join("");
    }
    static digestMessage(message) {
        const encoder = new TextEncoder(),
            data = encoder.encode(message);
        return window.crypto.subtle.digest("SHA-256", data);
    }
    static digestHex(data) {
        return new Promise((resolve, reject) => {
            this.digestMessage(data).then((digest) => {
                try {
                    resolve(this.digestToHex(digest));
                } catch (ex) {
                    reject(ex);
                }
            }, reject);
        });
    }
    static encodeText(text) {
        const encoder = new TextEncoder();
        return encoder.encode(text);
    }
}
(XmlHttpRequest.DONE = XMLHttpRequest.DONE),
    (XmlHttpRequest.HEADERS_RECEIVED = XMLHttpRequest.HEADERS_RECEIVED),
    (XmlHttpRequest.LOADING = XMLHttpRequest.LOADING),
    (XmlHttpRequest.OPENED = XMLHttpRequest.OPENED),
    (XmlHttpRequest.UNSENT = XMLHttpRequest.UNSENT),
    (XmlHttpRequest.globalListeners = []),
    (function (bh) {
        let utils;
        !(function (utils) {
            let timeout,
                listener = () => ResizeManager.fire();
            class ResizeManager {
                static fire() {
                    timeout && clearTimeout(timeout), (timeout = setTimeout(resize, 100));
                }
                static startListening() {
                    ResizeManager.fire(), window.$(window).on("resize", listener);
                }
                static stopListening() {
                    window.$(window).off("resize", listener);
                }
            }
            function resize() {
                let all = window.$(".resize-manager"),
                    heightScrollers = all.filter(".resize-height").css("height", 0);
                heightScrollers.length &&
                    heightScrollers.each((index, element) => {
                        let maxHeight = document.documentElement.clientHeight,
                            scroller = window.$(element).css("height", maxHeight);
                        for (; document.documentElement.clientHeight < document.documentElement.scrollHeight && maxHeight > 0; ) scroller.css("height", --maxHeight);
                    });
                let widthScrollers = all.filter(".resize-width").css("width", 0);
                widthScrollers.length &&
                    widthScrollers.each((index, element) => {
                        let maxWidth = document.documentElement.clientWidth,
                            scroller = window.$(element).css("width", maxWidth);
                        for (; document.documentElement.clientWidth < document.documentElement.scrollWidth && maxWidth > 0; ) scroller.css("width", --maxWidth);
                    });
            }
            utils.ResizeManager = ResizeManager;
        })((utils = bh.utils || (bh.utils = {})));
    })(bh || (bh = {})),
    (function (bh) {
        let utils;
        !(function (utils) {
            let sort;
            !(function (sort) {
                function byElement(a, b) {
                    return a.elementType == b.elementType ? 0 : a.elementType < b.elementType ? -1 : 1;
                }
                function byElementThenKlass(a, b) {
                    return byElement(a, b) || byKlass(a, b);
                }
                function byElementThenName(a, b) {
                    return byElement(a, b) || byName(a, b);
                }
                function byElementThenRarityThenName(a, b) {
                    return byElement(a, b) || byRarityThenName(a, b);
                }
                function byKlass(a, b) {
                    return a.klassType == b.klassType ? 0 : a.klassType < b.klassType ? -1 : 1;
                }
                function byEvoLevel(a, b) {
                    return a.evoLevel == b.evoLevel ? 0 : +a.evoLevel < +b.evoLevel ? -1 : 1;
                }
                function byEvoLevelThenName(a, b) {
                    return byEvoLevel(a, b) || byName(a, b);
                }
                function byName(a, b) {
                    let an = a.lower || a.name.toLowerCase(),
                        bn = b.lower || b.name.toLowerCase();
                    return "sands of time" == an ? -1 : "sands of time" == bn ? 1 : an == bn ? 0 : an < bn ? -1 : 1;
                }
                function byPosition(a, b) {
                    let ap = bh.PositionType[a.position],
                        bp = bh.PositionType[b.position];
                    return ap == bp ? 0 : ap > bp ? -1 : 1;
                }
                function byPositionThenName(a, b) {
                    return byPosition(a, b) || byName(a, b);
                }
                function byRarity(a, b) {
                    return a.rarityType == b.rarityType ? 0 : a.rarityType < b.rarityType ? -1 : 1;
                }
                function byRarityThenName(a, b) {
                    return byRarity(a, b) || byName(a, b);
                }
                function byRarityThenNameThenEvoLevel(a, b) {
                    return byRarity(a, b) || byName(a, b) || byEvoLevel(a, b);
                }
                function byRarityThenEvoLevelThenName(a, b) {
                    return byRarity(a, b) || byEvoLevel(a, b) || byName(a, b);
                }
                function byNameThenRarityThenEvo(a, b) {
                    return byName(a, b) || byRarity(a, b) || byEvoLevel(a, b);
                }
                (sort.byElement = byElement),
                    (sort.byElementThenKlass = byElementThenKlass),
                    (sort.byElementThenName = byElementThenName),
                    (sort.byElementThenRarityThenName = byElementThenRarityThenName),
                    (sort.byKlass = byKlass),
                    (sort.byEvoLevel = byEvoLevel),
                    (sort.byEvoLevelThenName = byEvoLevelThenName),
                    (sort.byName = byName),
                    (sort.byPosition = byPosition),
                    (sort.byPositionThenName = byPositionThenName),
                    (sort.byRarity = byRarity),
                    (sort.byRarityThenName = byRarityThenName),
                    (sort.byRarityThenNameThenEvoLevel = byRarityThenNameThenEvoLevel),
                    (sort.byRarityThenEvoLevelThenName = byRarityThenEvoLevelThenName),
                    (sort.byNameThenRarityThenEvo = byNameThenRarityThenEvo);
            })((sort = utils.sort || (utils.sort = {})));
        })((utils = bh.utils || (bh.utils = {})));
    })(bh || (bh = {}));
