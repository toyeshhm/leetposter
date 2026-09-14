# The world of Leetposter (lore bible for problem authors)

Read this before writing a problem. Every problem in the bank lives in this world. Keep it dry,
a little ominous, never cute. No exclamation marks. No em dashes. One or two sentences of lore
per problem is enough; the algorithmic content must stand on its own.

## The Hall
A candlelit stone hall where a Company of scribes meets after dark to solve one hard problem
before the candle burns down. Halls are named by five-letter sigils (KANEP, TGLWX, EETYT).
The candle is the clock. When it gutters, the Reckoning begins.

## The Company and the seats
- The Cartographer holds the map: the topic tags. Says "this is a hash map" with confidence.
- The Oracle holds the hints, in order, and gives them up one at a time when asked.
- The Warden holds the constraints: the bounds, the limits, the time and memory the Judge allows.
  The Warden's favourite lie is "n is at most a thousand".
- The Herald carries the file to the Judge and returns with a verdict. Four attempts, then the
  Judge closes the door. Heralds have been known to forget the link.
- The Changeling sits among them holding a seat like anyone else, and lies on cards and on voice.
  The one thing never faked is the verdict.

## The Judge
Never seen. Answers only Accepted or Rejected, and names a category: Wrong Answer, Time Limit,
Runtime Error, Memory Limit, Compile Error. Does not explain. The fourth rejection is final.

## Rituals
- The Reading: five minutes alone with the statement before anyone speaks.
- The Work: forty minutes at the shared file.
- The Tribunal: anyone may ring the bell once. Hands off the keyboard until the vote is in.
- The Reckoning: the final vote when the candle is out. No skip.
- The Unmasking: every card laid next to the truth.

## Running jokes (use sparingly, one per problem at most)
- "Off by one" is a curse word in the Hall.
- The Warden's bounds are always suspicious; a problem may hinge on whether n is 10^3 or 10^5.
- "Premium lock icon": some knowledge is behind a paywall nobody in the Hall can afford.
- Two Sum is the Hall's nursery rhyme; everyone claims to have solved it as a child.
- The candle, the bell, the seal (Accepted) and the broken seal (Rejected) recur as motifs.
- "The table owes you a drink" is what they say to someone wrongly cast out.
- Heralds submit in Python because the Judge's C++ door has been stuck for years.

## Recurring characters (optional, no more than one per problem)
Ada the host who always opens the hall, Brin the Oracle who reads hints in a monotone, Cass the
Cartographer who has never once been wrong about a tag and is therefore never trusted, Dov the
Herald who forgot the link, the Warden of the North Gate who counts everything twice, and the
Changeling, who is whoever you least suspect.

## Problem framing
Every problem is a task the Company must finish before the candle dies: counting candles,
routing a message through a network of halls, decoding a ledger, ordering the tribunal's votes,
verifying a seal. Inputs are read from standard input, outputs go to standard output, exactly as
in competitive programming, because the Judge in the Hall only speaks stdin and stdout.
