import SmartCommitTokenizer from "../../src/smart-commit-tokenizer";

describe("SmartCommitTokenizer", () => {
  const tokenize = async (source) => {
    const tokenizer = SmartCommitTokenizer();
    tokenizer.reset(source);
    return Array.from(tokenizer);
  };

  const valuesForType = function(tokens, type) {
    return tokens.filter(token => token.type === type).map(token => token.value);
  };

  describe("issue keys", () => {
    it("extracts a single issue key", async () => {
      const tokens = await tokenize("JRA-123");

      expect(valuesForType(tokens, "issueKey")).toEqual(["JRA-123"]);
    });

    it("extracts multiple issue keys", async () => {
      const tokens = await tokenize("JRA-123 JRA-456");

      expect(valuesForType(tokens, "issueKey")).toEqual(["JRA-123", "JRA-456"]);
    });

    it("extracts issue keys embedded in branch names", async () => {
      const tokens = await tokenize("feature/JRA-123-my-feature");

      expect(valuesForType(tokens, "issueKey")).toEqual(["JRA-123"]);
    });

    it("extracts issue keys prefixed with a hash", async () => {
      const tokens = await tokenize("#JRA-123 [#JRA-456]");

      expect(valuesForType(tokens, "issueKey")).toEqual(["JRA-123", "JRA-456"]);
    });

    it("extracts issue key surrounded by other text", async () => {
      const tokens = await tokenize("there is some text here JRA-123 and some text here");

      expect(valuesForType(tokens, "issueKey")).toEqual(["JRA-123"]);
    });

    it("does not extract issue key that contain underscores", async () => {
      const tokens = await tokenize("J_1993A-090 J_1993A-090");

      expect(valuesForType(tokens, "issueKey")).toEqual([]);
    });

    it("does not extract issue key that start with underscores or numbers", async () => {
      const tokens = await tokenize("_1993A-090 1993A-090");

      expect(valuesForType(tokens, "issueKey")).toEqual([]);
    });

    it("extracts issue keys from branch names", async () => {
      const tokens = await tokenize("branchname_JRA-096 feature/LIEF-12155-test-jira");

      expect(valuesForType(tokens, "issueKey")).toEqual(["JRA-096", "LIEF-12155"]);
    });
  });

  describe("transitions", () => {
    it("extracts issue key and comment text", async () => {
      const tokens = await tokenize("JRA-34 #comment corrected indent issue");

      expect(valuesForType(tokens, "issueKey")).toEqual(["JRA-34"]);
      expect(valuesForType(tokens, "comment")).toEqual(["corrected", "indent", "issue"]);
    });

    it("extracts issue key, transition, and comment text", async () => {
      const tokens = await tokenize("JRA-090 #close Fixed this today");

      expect(valuesForType(tokens, "issueKey")).toEqual(["JRA-090"]);
      expect(valuesForType(tokens, "comment")).toEqual(["Fixed", "this", "today"]);
      expect(valuesForType(tokens, "transition")).toEqual(["close"]);
    });

    it("extracts transition containing hyphen", async () => {
      const tokens = await tokenize("JRA-090 #finish-work Fixed this today");

      expect(valuesForType(tokens, "issueKey")).toEqual(["JRA-090"]);
      expect(valuesForType(tokens, "comment")).toEqual(["Fixed", "this", "today"]);
      expect(valuesForType(tokens, "transition")).toEqual(["finish-work"]);
    });

    it("ignores issue keys within a comment", async () => {
      const tokens = await tokenize("JRA-123 #comment This is related to JRA-456");

      expect(valuesForType(tokens, "issueKey")).toEqual(["JRA-123"]);
      expect(valuesForType(tokens, "comment")).toEqual(["This", "is", "related", "to", "JRA-456"]);
    });
  });

  describe("time", () => {
    it("extracts issue key and time", async () => {
      const tokens = await tokenize("JRA-34 #time 1w 2d");

      expect(valuesForType(tokens, "issueKey")).toEqual(["JRA-34"]);
      expect(valuesForType(tokens, "weeks")).toEqual(["1"]);
      expect(valuesForType(tokens, "days")).toEqual(["2"]);
    });

    it("extracts issue key, time, and work log comment text", async () => {
      const tokens = await tokenize("JRA-34 #time 1w 2d 4h 30m Total work logged");

      expect(valuesForType(tokens, "issueKey")).toEqual(["JRA-34"]);
      expect(valuesForType(tokens, "weeks")).toEqual(["1"]);
      expect(valuesForType(tokens, "days")).toEqual(["2"]);
      expect(valuesForType(tokens, "hours")).toEqual(["4"]);
      expect(valuesForType(tokens, "minutes")).toEqual(["30"]);
      expect(valuesForType(tokens, "workLogComment")).toEqual(["Total", "work", "logged"]);
    });

    it("extracts decimal times", async () => {
      const tokens = await tokenize("JRA-34 #time 1.11w 2.22d 4.44h 3.33m");

      expect(valuesForType(tokens, "weeks")).toEqual(["1.11"]);
      expect(valuesForType(tokens, "days")).toEqual(["2.22"]);
      expect(valuesForType(tokens, "hours")).toEqual(["4.44"]);
      expect(valuesForType(tokens, "minutes")).toEqual(["3.33"]);
    });

    it("only extracts comment from single line", async () => {
      const tokens = await tokenize("JRA-34 #time this is the comment\nthis is not");

      expect(valuesForType(tokens, "workLogComment")).toEqual(["this", "is", "the", "comment"]);
    });
  });

  describe("advanced", () => {
    it("extracts multiple issues with time (days, hours), comment, and a transition", async () => {
      const tokens = await tokenize("JRA-123 JRA-234 JRA-345 #resolve #time 2d 5h #comment ahead of schedule");

      expect(valuesForType(tokens, "issueKey")).toEqual(["JRA-123", "JRA-234", "JRA-345"]);
      expect(valuesForType(tokens, "transition")).toEqual(["resolve", "comment"]);
      expect(valuesForType(tokens, "days")).toEqual(["2"]);
      expect(valuesForType(tokens, "hours")).toEqual(["5"]);
      expect(valuesForType(tokens, "comment")).toEqual(["ahead", "of", "schedule"]);
    });

    it("extracts multiple issues with time (minutes), comment, and a transition", async () => {
      const tokens = await tokenize("JRA-123 #comment This is a comment #start-development #time 4m");

      expect(valuesForType(tokens, "issueKey")).toEqual(["JRA-123"]);
      expect(valuesForType(tokens, "transition")).toEqual(["comment", "start-development"]);
      expect(valuesForType(tokens, "minutes")).toEqual(["4"]);
      expect(valuesForType(tokens, "comment")).toEqual(["This", "is", "a", "comment"]);
    });

    it("supports unicode characters", async () => {
      const tokens = await tokenize("JRA-123 #comment ✌🏻 all done");

      expect(valuesForType(tokens, "issueKey")).toEqual(["JRA-123"]);
      expect(valuesForType(tokens, "comment")).toEqual(["✌🏻", "all", "done"]);
    });
  });

  describe("multiline source", () => {
    it("pulls issue keys, transitions, and comments", async () => {
      const tokens = await tokenize("WS-2 #close This one is done\nWS-3 #reopen This one needs work");

      expect(valuesForType(tokens, "issueKey")).toEqual(["WS-2", "WS-3"]);
      expect(valuesForType(tokens, "transition")).toEqual(["close", "reopen"]);
      expect(valuesForType(tokens, "comment")).toEqual(["This", "one", "is", "done", "This", "one", "needs", "work"]);
    });

    it("splits work log from the next line", async () => {
      const tokens = await tokenize("WS-2 #time 1w almost done\nWS-3 #reopen");

      expect(valuesForType(tokens, "issueKey")).toEqual(["WS-2", "WS-3"]);
      expect(valuesForType(tokens, "workLogComment")).toEqual(["almost", "done"]);
      expect(valuesForType(tokens, "transition")).toEqual(["reopen"]);
    });
  });

  describe("syntax examples", () => {
    it("accepts any kind of syntax", async () => {
      await tokenize("WS-2\n\nThis fixes a problem.\n\nWS-2 #done #time 1w 2d 3h 4m");
      await tokenize("This is a bunch of junk\n\n\twith  no #@FJ94Afa39 key or #whatever");
      await tokenize(".....#close Something foo bar....\n\nbaz");
      await tokenize(".....#time Something foo bar 1d 3w\n");
      await tokenize("WS-2\n\nThis fixes a problem.\r\n\r\nWS-2 #done #time 1w 2d 3h 4m");
      await tokenize("WS-2\r\rWS-3\n\nWhatever\r\nMore");
      await tokenize("there is an invisible unicode character here -> <-"); // eslint-disable-line no-irregular-whitespace
      await tokenize("😌 Emoji are totally 💯 fine ✨");
      await tokenize("Rename Node#move to Node#move_within");
      // Linter isn't happy about unicode whitespace characters
      // This example ends with a unicode line separator
      // eslint-disable-next-line no-irregular-whitespace
      await tokenize(`JRA-123 #resolve do the thing to the code #time 3h `);
      // These examples includes every type of Unicode whitespace character
      const allUnicodeWhitespaceCharacters = "foo bar foo bar foo bar foo᠎bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo​bar foo bar foo bar foo　bar foo﻿bar";
      await tokenize(`${allUnicodeWhitespaceCharacters}`);
      await tokenize(`JRA-123 #resolve ${allUnicodeWhitespaceCharacters} #time 3h`);
      await tokenize(`JRA-123 #resolve #time ${allUnicodeWhitespaceCharacters} 3h`);
      await tokenize(`JRA-123 #resolve #time 3h ${allUnicodeWhitespaceCharacters}`);
    });
  });
});
