/** Current MLB ballparks, in division order. `been` is a park Jacob has visited. */
export const PARKS: { teamId: number; name: string; been: boolean }[] = [
  { teamId: 110, name: "Oriole Park at Camden Yards", been: false },
  { teamId: 111, name: "Fenway Park", been: false },
  { teamId: 147, name: "Yankee Stadium", been: true },
  { teamId: 139, name: "Tropicana Field", been: false },
  { teamId: 141, name: "Rogers Centre", been: false },
  { teamId: 145, name: "Rate Field", been: false },
  { teamId: 114, name: "Progressive Field", been: true },
  { teamId: 116, name: "Comerica Park", been: false },
  { teamId: 118, name: "Kauffman Stadium", been: false },
  { teamId: 142, name: "Target Field", been: false },
  { teamId: 117, name: "Daikin Park", been: false },
  { teamId: 108, name: "Angel Stadium", been: false },
  { teamId: 133, name: "Sutter Health Park", been: false },
  { teamId: 136, name: "T-Mobile Park", been: false },
  { teamId: 140, name: "Globe Life Field", been: false },
  { teamId: 144, name: "Truist Park", been: false },
  { teamId: 146, name: "loanDepot park", been: true },
  { teamId: 121, name: "Citi Field", been: true },
  { teamId: 143, name: "Citizens Bank Park", been: false },
  { teamId: 120, name: "Nationals Park", been: false },
  { teamId: 112, name: "Wrigley Field", been: false },
  { teamId: 113, name: "Great American Ball Park", been: false },
  { teamId: 158, name: "American Family Field", been: false },
  { teamId: 134, name: "PNC Park", been: true },
  { teamId: 138, name: "Busch Stadium", been: false },
  { teamId: 109, name: "Chase Field", been: false },
  { teamId: 115, name: "Coors Field", been: false },
  { teamId: 119, name: "Dodger Stadium", been: true },
  { teamId: 135, name: "Petco Park", been: false },
  { teamId: 137, name: "Oracle Park", been: false },
]

export const BONUS_PARKS = [
  { name: "Shea Stadium", club: "Mets" },
  { name: "Old Yankee Stadium", club: "Yankees" },
]

export const FAVORITE_PLAYERS = [
  { id: 701762, name: "Nick Kurtz", team: "A's" },
  { id: 805779, name: "Jacob Wilson", team: "A's" },
  { id: 691718, name: "Pete Crow-Armstrong", team: "Cubs" },
  { id: 592450, name: "Aaron Judge", team: "Yankees" },
]

export const GREW_UP = [
  { id: 123744, name: "Omar Vizquel" },
  { id: 116539, name: "Derek Jeter" },
]

export const ATHLETICS = 133
