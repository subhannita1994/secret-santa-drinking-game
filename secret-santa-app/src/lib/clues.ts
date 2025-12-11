// Using Participant type from Prisma - will be available after prisma generate
type Participant = {
  id: string
  gameId: string
  name: string
  email: string
  gender: string
  yearMoved: number
}
import { Assignment, decryptAssignments } from './crypto'

export interface ClueData {
  text: string
  type: 'gender' | 'year' | 'count' | 'specific'
  difficulty: 'easy' | 'medium' | 'hard'
}

/**
 * Generate exactly 3 clues based on assignments and participant data
 * Focus only on non-obvious gifting patterns that help guess Secret Santa
 */
export function generateClues(
  encryptedAssignments: string,
  participants: Participant[],
  exclusions: Array<{participant1: string, participant2: string}> = []
): ClueData[] {
  const assignments = decryptAssignments(encryptedAssignments)
  const participantMap = new Map(participants.map(p => [p.id, p]))

  // Generate all possible clues
  const allClues: ClueData[] = []
  
  // Generate gender-based gifting clues (filtered for non-obvious ones)
  allClues.push(...generateGenderGiftingClues(assignments, participantMap, exclusions))
  
  // Generate year-based gifting clues
  allClues.push(...generateYearGiftingClues(assignments, participantMap))
  
  // Generate specific participant pattern clues
  allClues.push(...generateSpecificPatternClues(assignments, participantMap))

  // Shuffle and ensure exactly 3 clues
  const shuffled = allClues.sort(() => Math.random() - 0.5)
  
  // If we have fewer than 3, generate backup clues
  if (shuffled.length < 3) {
    shuffled.push(...generateBackupClues(assignments, participantMap, 3 - shuffled.length))
  }
  
  return shuffled.slice(0, 3)
}

function generateGenderGiftingClues(
  assignments: Assignment[],
  participantMap: Map<string, Participant>,
  exclusions: Array<{participant1: string, participant2: string}> = []
): ClueData[] {
  const clues: ClueData[] = []

  // Count gender patterns in gifting
  let menToWomen = 0
  let womenToMen = 0
  let menToMen = 0
  let womenToWomen = 0

  for (const assignment of assignments) {
    const giver = participantMap.get(assignment.giverId)
    const receiver = participantMap.get(assignment.receiverId)
    
    if (!giver || !receiver) continue

    if (giver.gender.toLowerCase() === 'male' && receiver.gender.toLowerCase() === 'female') {
      menToWomen++
    } else if (giver.gender.toLowerCase() === 'female' && receiver.gender.toLowerCase() === 'male') {
      womenToMen++
    } else if (giver.gender.toLowerCase() === 'male' && receiver.gender.toLowerCase() === 'male') {
      menToMen++
    } else if (giver.gender.toLowerCase() === 'female' && receiver.gender.toLowerCase() === 'female') {
      womenToWomen++
    }
  }

  // Check if gender patterns are obvious from exclusions
  const excludedPairs = new Set(exclusions.map(e => `${e.participant1}-${e.participant2}`))
  const isGenderPatternObvious = (pattern: string) => {
    // If couples are excluded and they represent all same-gender pairs, 
    // then statements about same-gender gifting become obvious
    const participants = [...participantMap.values()]
    const males = participants.filter(p => p.gender.toLowerCase() === 'male')
    const females = participants.filter(p => p.gender.toLowerCase() === 'female')
    
    // Check if all same-gender pairs are excluded
    if (pattern.includes('women are giving gifts to other women') && females.length === 2) {
      return exclusions.some(e => 
        (females.some(f => f.name === e.participant1) && females.some(f => f.name === e.participant2))
      )
    }
    
    if (pattern.includes('men are giving gifts to other men') && males.length === 2) {
      return exclusions.some(e => 
        (males.some(m => m.name === e.participant1) && males.some(m => m.name === e.participant2))
      )
    }
    
    return false
  }

  // Generate useful, non-obvious gifting pattern clues
  if (menToWomen === 0 && !isGenderPatternObvious("men to women")) {
    clues.push({
      text: "No men are giving gifts to women",
      type: 'gender',
      difficulty: 'medium'
    })
  } else if (menToWomen === 1) {
    clues.push({
      text: "Exactly one man is giving a gift to a woman",
      type: 'gender',
      difficulty: 'easy'
    })
  } else if (menToWomen > 1) {
    clues.push({
      text: `${menToWomen} men are giving gifts to women`,
      type: 'gender',
      difficulty: 'easy'
    })
  }

  if (womenToMen === 0 && !isGenderPatternObvious("women to men")) {
    clues.push({
      text: "No women are giving gifts to men",
      type: 'gender',
      difficulty: 'medium'
    })
  } else if (womenToMen === 1) {
    clues.push({
      text: "Exactly one woman is giving a gift to a man",
      type: 'gender',
      difficulty: 'easy'
    })
  } else if (womenToMen > 1) {
    clues.push({
      text: `${womenToMen} women are giving gifts to men`,
      type: 'gender',
      difficulty: 'easy'
    })
  }

  if (menToMen === 0 && !isGenderPatternObvious("men are giving gifts to other men")) {
    clues.push({
      text: "No men are giving gifts to other men",
      type: 'gender',
      difficulty: 'medium'
    })
  }

  if (womenToWomen === 0 && !isGenderPatternObvious("women are giving gifts to other women")) {
    clues.push({
      text: "No women are giving gifts to other women",
      type: 'gender',
      difficulty: 'medium'
    })
  }

  return clues
}

function generateYearGiftingClues(
  assignments: Assignment[],
  participantMap: Map<string, Participant>
): ClueData[] {
  const clues: ClueData[] = []
  
  // Find year patterns in gifting relationships
  const yearAssignments = assignments.map(assignment => ({
    giverYear: participantMap.get(assignment.giverId)?.yearMoved || 0,
    receiverYear: participantMap.get(assignment.receiverId)?.yearMoved || 0,
    giver: participantMap.get(assignment.giverId),
    receiver: participantMap.get(assignment.receiverId)
  })).filter(a => a.giver && a.receiver)

  // Find earliest and latest movers
  const years = [...participantMap.values()].map(p => p.yearMoved)
  const earliestYear = Math.min(...years)
  const latestYear = Math.max(...years)
  
  const earliestMovers = [...participantMap.values()].filter(p => p.yearMoved === earliestYear)
  const latestMovers = [...participantMap.values()].filter(p => p.yearMoved === latestYear)

  // Generate useful year-based gifting clues
  if (earliestMovers.length === 1) {
    const earliestMover = earliestMovers[0]
    const assignment = yearAssignments.find(a => a.giver?.id === earliestMover.id)
    if (assignment && assignment.receiverYear !== earliestYear) {
      clues.push({
        text: `The longest Montreal resident (since ${earliestYear}) is giving to someone who arrived in ${assignment.receiverYear}`,
        type: 'year',
        difficulty: 'medium'
      })
    }
  }

  if (latestMovers.length === 1) {
    const latestMover = latestMovers[0]
    const assignment = yearAssignments.find(a => a.receiver?.id === latestMover.id)
    if (assignment && assignment.giverYear !== latestYear) {
      clues.push({
        text: `The newest Montreal resident (arrived ${latestYear}) is receiving from someone who moved in ${assignment.giverYear}`,
        type: 'year',
        difficulty: 'medium'
      })
    }
  }

  // Same year gifting patterns
  const sameYearCount = yearAssignments.filter(a => a.giverYear === a.receiverYear).length
  if (sameYearCount === 0) {
    clues.push({
      text: "No one is giving a gift to someone who moved to Montreal in the same year as them",
      type: 'year',
      difficulty: 'easy'
    })
  } else if (sameYearCount === 1) {
    clues.push({
      text: "Exactly one person is giving a gift to someone who moved to Montreal in the same year as them",
      type: 'year',
      difficulty: 'medium'
    })
  } else if (sameYearCount > 1) {
    clues.push({
      text: `${sameYearCount} people are giving gifts to someone who moved to Montreal in the same year as them`,
      type: 'year',
      difficulty: 'hard'
    })
  }

  // Older vs newer resident patterns
  const olderToNewer = yearAssignments.filter(a => a.giverYear < a.receiverYear).length
  const newerToOlder = yearAssignments.filter(a => a.giverYear > a.receiverYear).length

  if (olderToNewer === 0) {
    clues.push({
      text: "No longtime Montreal residents are giving gifts to newer residents",
      type: 'year',
      difficulty: 'medium'
    })
  }

  if (newerToOlder === 0) {
    clues.push({
      text: "No newer Montreal residents are giving gifts to longtime residents",
      type: 'year',
      difficulty: 'medium'
    })
  }

  return clues
}

function generateSpecificPatternClues(
  assignments: Assignment[],
  participantMap: Map<string, Participant>
): ClueData[] {
  const clues: ClueData[] = []
  
  // Generate specific but anonymized clues about particular assignments
  const participants = [...participantMap.values()]
  const years = [...new Set(participants.map(p => p.yearMoved))].sort()
  
  // Find interesting year transitions
  const yearAssignments = assignments.map(assignment => ({
    giverYear: participantMap.get(assignment.giverId)?.yearMoved || 0,
    receiverYear: participantMap.get(assignment.receiverId)?.yearMoved || 0,
    giver: participantMap.get(assignment.giverId),
    receiver: participantMap.get(assignment.receiverId)
  })).filter(a => a.giver && a.receiver && a.giverYear !== a.receiverYear)

  // Generate specific year-gap clues
  if (yearAssignments.length > 0) {
    const randomAssignment = yearAssignments[Math.floor(Math.random() * yearAssignments.length)]
    const yearGap = Math.abs(randomAssignment.giverYear - randomAssignment.receiverYear)
    
    if (yearGap > 1) {
      clues.push({
        text: `Someone who moved to Montreal in ${randomAssignment.giverYear} is giving to someone who arrived in ${randomAssignment.receiverYear}`,
        type: 'year',
        difficulty: 'hard'
      })
    }
  }

  // Generate clues about year ranges
  if (years.length >= 3) {
    const oldestYear = Math.min(...years)
    const newestYear = Math.max(...years)
    const middleYears = years.filter(y => y !== oldestYear && y !== newestYear)
    
    if (middleYears.length > 0) {
      const someoneGivingToMiddle = assignments.some(a => {
        const receiverYear = participantMap.get(a.receiverId)?.yearMoved
        return middleYears.includes(receiverYear || 0)
      })
      
      if (someoneGivingToMiddle) {
        clues.push({
          text: `At least one person is giving to someone who moved to Montreal between ${oldestYear + 1} and ${newestYear - 1}`,
          type: 'year',
          difficulty: 'medium'
        })
      }
    }
  }

  return clues
}

function generateBackupClues(
  assignments: Assignment[],
  participantMap: Map<string, Participant>,
  needed: number
): ClueData[] {
  const clues: ClueData[] = []
  const participants = [...participantMap.values()]
  
  // Generate backup clues that are always useful
  if (needed > 0) {
    // Count total cross-gender assignments
    const crossGenderCount = assignments.filter(a => {
      const giver = participantMap.get(a.giverId)
      const receiver = participantMap.get(a.receiverId)
      return giver && receiver && giver.gender !== receiver.gender
    }).length
    
    if (crossGenderCount > 0) {
      clues.push({
        text: `${crossGenderCount} ${crossGenderCount === 1 ? 'person is' : 'people are'} giving gifts to someone of a different gender`,
        type: 'gender',
        difficulty: 'easy'
      })
    }
  }
  
  if (needed > 1) {
    // Find the most common year difference
    const yearDifferences = assignments.map(a => {
      const giver = participantMap.get(a.giverId)
      const receiver = participantMap.get(a.receiverId)
      return Math.abs((giver?.yearMoved || 0) - (receiver?.yearMoved || 0))
    }).filter(diff => diff > 0)
    
    if (yearDifferences.length > 0) {
      const avgYearDiff = Math.round(yearDifferences.reduce((a, b) => a + b, 0) / yearDifferences.length)
      clues.push({
        text: `The average time difference between when gift-givers and receivers moved to Montreal is ${avgYearDiff} years`,
        type: 'year',
        difficulty: 'medium'
      })
    }
  }
  
  if (needed > 2) {
    // Find Montreal "generations" (early vs late arrivals)
    const allYears = participants.map(p => p.yearMoved).sort()
    const medianYear = allYears[Math.floor(allYears.length / 2)]
    
    const oldTimersGivingToNewcomers = assignments.filter(a => {
      const giver = participantMap.get(a.giverId)
      const receiver = participantMap.get(a.receiverId)
      return giver && receiver && giver.yearMoved < medianYear && receiver.yearMoved >= medianYear
    }).length
    
    if (oldTimersGivingToNewcomers > 0) {
      clues.push({
        text: `${oldTimersGivingToNewcomers} Montreal veterans (arrived before ${medianYear}) are giving to newcomers`,
        type: 'year',
        difficulty: 'hard'
      })
    }
  }
  
  return clues.slice(0, needed)
}

