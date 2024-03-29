export type LeftBracket = '[';
export type RightBracket = ']';
export type LeftBrace = '{';
export type RightBrace = '}';
export type Comma = ',';
export type Quote = '"';
export type NewLine = '\n';
export type Colon = ':';
export type Space = ' ';
export type WhiteSpace = NewLine | Space;
export type AnySymbol = LeftBracket | RightBracket | Comma | Quote;

export type UppercaseChar = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L' | 'M' | 'N' | 'O' | 'P' | 'Q' | 'R' | 'S' | 'T' | 'U' | 'V' | 'W' | 'X' | 'Y' | 'Z';
export type Char = UppercaseChar | Lowercase<UppercaseChar>;
export type Digit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';