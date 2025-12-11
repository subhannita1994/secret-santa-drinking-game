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

interface ParticipantAnalysis {
  yearDistribution: Map<number, number>
  genderDistribution: { male: number, female: number }
  mostCommonYear: number
  mostCommonYearCount: number
  uniqueYears: number
  totalParticipants: number
  excludedPairsCount: number
  isYearDistributionSkewed: boolean
  isGenderBalanced: boolean
}

/**
 * Generate exactly 10 clues based on assignments and participant data
 * Focus only on non-obvious gifting patterns that help guess Secret Santa
 */
export function generateClues(
  encryptedAssignments: string,
  participants: Participant[],
  exclusions: Array<{participant1: string, participant2: string}> = []
): ClueData[] {
  const assignments = decryptAssignments(encryptedAssignments)
  const participantMap = new Map(participants.map(p => [p.id, p]))

  // Analyze participant distribution to understand what would be "obvious"
  const participantAnalysis = analyzeParticipantDistribution(participants, exclusions)

  // Generate all possible clues
  const allClues: ClueData[] = []
  
  // Generate gender-based gifting clues (filtered for non-obvious ones)
  allClues.push(...generateGenderGiftingClues(assignments, participantMap, exclusions))
  
  // Generate year-based gifting clues
  allClues.push(...generateYearGiftingClues(assignments, participantMap))
  
  // Generate specific participant pattern clues
  allClues.push(...generateSpecificPatternClues(assignments, participantMap))

  // Filter out obvious clues based on participant distribution and constraints
  const nonObviousClues = allClues.filter(clue => 
    !isClueObvious(clue, assignments, participantMap, participantAnalysis, exclusions)
  )

  // Shuffle the non-obvious clues
  const shuffled = nonObviousClues.sort(() => Math.random() - 0.5)
  
  // If we have fewer than 10, generate smart backup clues
  if (shuffled.length < 10) {
    const backupClues = generateSmartBackupClues(
      assignments, 
      participantMap, 
      participantAnalysis,
      exclusions,
      10 - shuffled.length
    )
    shuffled.push(...backupClues)
  }
  
  return shuffled.slice(0, 10)
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

  // Only generate same/different year clues if there's meaningful diversity
  const uniqueYears = [...new Set(yearAssignments.map(a => a.giverYear).concat(yearAssignments.map(a => a.receiverYear)))]
  
  if (uniqueYears.length >= 3) { // Only if there are at least 3 different years represented
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
    } else if (sameYearCount > 1 && sameYearCount < yearAssignments.length - 1) { // Not if it's almost everyone
      clues.push({
        text: `${sameYearCount} people are giving gifts to someone who moved to Montreal in the same year as them`,
        type: 'year',
        difficulty: 'hard'
      })
    }

    // Older vs newer resident patterns - only if there's real diversity
    const olderToNewer = yearAssignments.filter(a => a.giverYear < a.receiverYear).length
    const newerToOlder = yearAssignments.filter(a => a.giverYear > a.receiverYear).length

    // Only generate these clues if they're not predictable (i.e., not 0 or nearly all)
    if (olderToNewer === 0 && yearAssignments.length >= 4) {
      clues.push({
        text: "No longtime Montreal residents are giving gifts to newer residents",
        type: 'year',
        difficulty: 'medium'
      })
    }

    if (newerToOlder === 0 && yearAssignments.length >= 4) {
      clues.push({
        text: "No newer Montreal residents are giving gifts to longtime residents",
        type: 'year',
        difficulty: 'medium'
      })
    }
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

  // Only generate specific year-gap clues if there's real variety in years
  const uniqueGiverYears = [...new Set(yearAssignments.map(a => a.giverYear))]
  const uniqueReceiverYears = [...new Set(yearAssignments.map(a => a.receiverYear))]
  
  if (yearAssignments.length > 0 && uniqueGiverYears.length >= 2 && uniqueReceiverYears.length >= 2) {
    const randomAssignment = yearAssignments[Math.floor(Math.random() * yearAssignments.length)]
    const yearGap = Math.abs(randomAssignment.giverYear - randomAssignment.receiverYear)
    
    if (yearGap > 1) {
      // Only include if this specific pairing isn't the only option due to constraints
      const sameYearGivers = yearAssignments.filter(a => a.giverYear === randomAssignment.giverYear)
      if (sameYearGivers.length > 1 || uniqueGiverYears.length > 2) {
        clues.push({
          text: `Someone who moved to Montreal in ${randomAssignment.giverYear} is giving to someone who arrived in ${randomAssignment.receiverYear}`,
          type: 'year',
          difficulty: 'hard'
        })
      }
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
  // This is the old backup function, kept for compatibility
  // The new smart backup function is generateSmartBackupClues
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

  // Additional backup clues for when we need more than 3
  if (needed > 3) {
    const sameGenderCount = assignments.filter(a => {
      const giver = participantMap.get(a.giverId)
      const receiver = participantMap.get(a.receiverId)
      return giver && receiver && giver.gender === receiver.gender
    }).length
    
    if (sameGenderCount > 0) {
      clues.push({
        text: `${sameGenderCount} ${sameGenderCount === 1 ? 'person is' : 'people are'} giving gifts to someone of the same gender`,
        type: 'gender',
        difficulty: 'easy'
      })
    }
  }

  if (needed > 4) {
    // Count people giving to those who moved in earlier years
    const givingToEarlierMovers = assignments.filter(a => {
      const giver = participantMap.get(a.giverId)
      const receiver = participantMap.get(a.receiverId)
      return giver && receiver && giver.yearMoved > receiver.yearMoved
    }).length
    
    if (givingToEarlierMovers > 0) {
      clues.push({
        text: `${givingToEarlierMovers} newer Montreal residents are giving gifts to people who arrived before them`,
        type: 'year',
        difficulty: 'medium'
      })
    }
  }

  if (needed > 5) {
    // Count people giving to those who moved in later years
    const givingToLaterMovers = assignments.filter(a => {
      const giver = participantMap.get(a.giverId)
      const receiver = participantMap.get(a.receiverId)
      return giver && receiver && giver.yearMoved < receiver.yearMoved
    }).length
    
    if (givingToLaterMovers > 0) {
      clues.push({
        text: `${givingToLaterMovers} longtime Montreal residents are giving gifts to people who arrived after them`,
        type: 'year',
        difficulty: 'medium'
      })
    }
  }

  if (needed > 6) {
    // Find year spread
    const allYears = participants.map(p => p.yearMoved)
    const minYear = Math.min(...allYears)
    const maxYear = Math.max(...allYears)
    const yearSpread = maxYear - minYear
    
    if (yearSpread > 0) {
      clues.push({
        text: `The gift exchange spans ${yearSpread} years of Montreal arrival dates (${minYear} to ${maxYear})`,
        type: 'year',
        difficulty: 'hard'
      })
    }
  }

  if (needed > 7) {
    // Count unique years
    const uniqueYears = [...new Set(participants.map(p => p.yearMoved))].length
    clues.push({
      text: `Participants moved to Montreal across ${uniqueYears} different years`,
      type: 'count',
      difficulty: 'medium'
    })
  }

  if (needed > 8) {
    // Gender balance info
    const males = participants.filter(p => p.gender.toLowerCase() === 'male').length
    const females = participants.filter(p => p.gender.toLowerCase() === 'female').length
    
    if (males !== females) {
      const majority = males > females ? 'men' : 'women'
      const difference = Math.abs(males - females)
      clues.push({
        text: `There ${difference === 1 ? 'is' : 'are'} ${difference} more ${majority} than ${majority === 'men' ? 'women' : 'men'} in the group`,
        type: 'count',
        difficulty: 'easy'
      })
    } else {
      clues.push({
        text: `The group has an equal number of men and women`,
        type: 'count',
        difficulty: 'easy'
      })
    }
  }

  if (needed > 9) {
    // Total participants
    clues.push({
      text: `There are ${participants.length} people participating in this Secret Santa`,
      type: 'count',
      difficulty: 'easy'
    })
  }
  
  return clues.slice(0, needed)
}

/**
 * Analyze participant distribution to understand what clues would be obvious
 */
function analyzeParticipantDistribution(
  participants: Participant[],
  exclusions: Array<{participant1: string, participant2: string}> = []
): ParticipantAnalysis {
  const yearDistribution = new Map<number, number>()
  let males = 0
  let females = 0

  participants.forEach(participant => {
    const year = participant.yearMoved
    yearDistribution.set(year, (yearDistribution.get(year) || 0) + 1)
    
    if (participant.gender.toLowerCase() === 'male') {
      males++
    } else if (participant.gender.toLowerCase() === 'female') {
      females++
    }
  })

  const yearCounts = Array.from(yearDistribution.values())
  const mostCommonYearCount = Math.max(...yearCounts)
  const mostCommonYear = Array.from(yearDistribution.entries())
    .find(([year, count]) => count === mostCommonYearCount)?.[0] || 0

  // Determine if year distribution is heavily skewed (>70% in one year)
  const isYearDistributionSkewed = mostCommonYearCount / participants.length > 0.7

  return {
    yearDistribution,
    genderDistribution: { male: males, female: females },
    mostCommonYear,
    mostCommonYearCount,
    uniqueYears: yearDistribution.size,
    totalParticipants: participants.length,
    excludedPairsCount: exclusions.length,
    isYearDistributionSkewed,
    isGenderBalanced: Math.abs(males - females) <= 1
  }
}

/**
 * Determine if a clue would be too obvious given the participant distribution and constraints
 */
function isClueObvious(
  clue: ClueData,
  assignments: Assignment[],
  participantMap: Map<string, Participant>,
  analysis: ParticipantAnalysis,
  exclusions: Array<{participant1: string, participant2: string}> = []
): boolean {
  const clueText = clue.text.toLowerCase()

  // Year-based obviousness checks
  if (clue.type === 'year') {
    // If most people arrived in the same year and couples are excluded,
    // then statements about cross-year gifting become obvious
    if (analysis.isYearDistributionSkewed) {
      if (clueText.includes('different year') || 
          clueText.includes('same year') ||
          clueText.includes('who moved to montreal in the same year as them')) {
        
        // Check if this would be obvious due to exclusions
        // If most people are in one year and couples (who are excluded) are the minority,
        // then cross-year gifting becomes predictable
        const excludedPairsInMajorityYear = exclusions.filter(exclusion => {
          const person1 = Array.from(participantMap.values()).find(p => p.name === exclusion.participant1)
          const person2 = Array.from(participantMap.values()).find(p => p.name === exclusion.participant2)
          return person1?.yearMoved === analysis.mostCommonYear && 
                 person2?.yearMoved === analysis.mostCommonYear
        }).length

        // If most excluded pairs are in the same year as the majority,
        // then cross-year statements become obvious
        if (excludedPairsInMajorityYear >= analysis.excludedPairsCount * 0.5) {
          return true
        }
      }
    }

    // If there are only 2 unique years, year-based clues become too predictable
    if (analysis.uniqueYears <= 2) {
      return true
    }
  }

  // Gender-based obviousness checks
  if (clue.type === 'gender') {
    // If gender is heavily imbalanced, gender-based clues become obvious
    const { male, female } = analysis.genderDistribution
    const totalGender = male + female
    if (totalGender > 0) {
      const imbalanceRatio = Math.max(male, female) / totalGender
      if (imbalanceRatio > 0.8) { // More than 80% one gender
        return true
      }
    }

    // Check if exclusions make gender patterns obvious
    if (analysis.excludedPairsCount > 0 && totalGender <= 4) {
      // In small groups, couple exclusions can make gender patterns obvious
      return true
    }
  }

  // Count-based clues that are too specific for small groups
  if (clue.type === 'count' && analysis.totalParticipants <= 4) {
    if (clueText.includes('there are') && clueText.includes('people')) {
      return true // Total count is obvious in tiny groups
    }
  }

  return false
}

/**
 * Generate smarter backup clues that are less likely to be obvious
 */
function generateSmartBackupClues(
  assignments: Assignment[],
  participantMap: Map<string, Participant>,
  analysis: ParticipantAnalysis,
  exclusions: Array<{participant1: string, participant2: string}> = [],
  needed: number
): ClueData[] {
  const clues: ClueData[] = []
  const participants = Array.from(participantMap.values())

  // Generate clues about gift-giving patterns that are harder to predict
  if (needed > 0 && analysis.totalParticipants >= 5) {
    // Alphabetical patterns
    const alphabeticalGiving = assignments.filter(a => {
      const giver = participantMap.get(a.giverId)
      const receiver = participantMap.get(a.receiverId)
      if (!giver || !receiver) return false
      return giver.name.toLowerCase() < receiver.name.toLowerCase()
    }).length

    if (alphabeticalGiving > 0 && alphabeticalGiving !== analysis.totalParticipants) {
      clues.push({
        text: `${alphabeticalGiving} ${alphabeticalGiving === 1 ? 'person is' : 'people are'} giving gifts to someone whose name comes later in the alphabet`,
        type: 'specific',
        difficulty: 'hard'
      })
    }
  }

  if (needed > 1) {
    // Name length patterns
    const longToShortNames = assignments.filter(a => {
      const giver = participantMap.get(a.giverId)
      const receiver = participantMap.get(a.receiverId)
      if (!giver || !receiver) return false
      return giver.name.length > receiver.name.length
    }).length

    if (longToShortNames > 0) {
      clues.push({
        text: `${longToShortNames} ${longToShortNames === 1 ? 'person with a longer name is' : 'people with longer names are'} giving gifts to someone with a shorter name`,
        type: 'specific',
        difficulty: 'hard'
      })
    }
  }

  if (needed > 2 && !analysis.isYearDistributionSkewed) {
    // Year gap patterns (only if years aren't skewed)
    const yearGaps = assignments.map(a => {
      const giver = participantMap.get(a.giverId)
      const receiver = participantMap.get(a.receiverId)
      if (!giver || !receiver) return 0
      return Math.abs(giver.yearMoved - receiver.yearMoved)
    }).filter(gap => gap > 0)

    if (yearGaps.length > 0) {
      const maxGap = Math.max(...yearGaps)
      if (maxGap >= 2) {
        clues.push({
          text: `The biggest time gap between a gift-giver and receiver's Montreal arrival dates is ${maxGap} years`,
          type: 'year',
          difficulty: 'hard'
        })
      }
    }
  }

  if (needed > 3) {
    // Email domain patterns
    const emailDomains = participants.map(p => p.email.split('@')[1])
    const uniqueDomains = [...new Set(emailDomains)]
    
    if (uniqueDomains.length > 1 && uniqueDomains.length < participants.length) {
      const domainCounts = uniqueDomains.map(domain => 
        emailDomains.filter(d => d === domain).length
      )
      const mostCommonDomainCount = Math.max(...domainCounts)
      
      clues.push({
        text: `${mostCommonDomainCount} participants share the same email provider`,
        type: 'specific',
        difficulty: 'medium'
      })
    }
  }

  if (needed > 4) {
    // Vowel patterns in names
    const vowelCounts = participants.map(p => {
      const vowels = p.name.toLowerCase().match(/[aeiou]/g)
      return vowels ? vowels.length : 0
    })
    
    const avgVowels = vowelCounts.reduce((a, b) => a + b, 0) / vowelCounts.length
    
    clues.push({
      text: `The average number of vowels in participants' names is ${Math.round(avgVowels * 10) / 10}`,
      type: 'specific',
      difficulty: 'medium'
    })
  }

  if (needed > 5) {
    // Most recent arrivals pattern
    const sortedByYear = participants.sort((a, b) => b.yearMoved - a.yearMoved)
    const recentArrivals = sortedByYear.slice(0, Math.ceil(participants.length / 3))
    
    const recentArrivalsReceiving = assignments.filter(a => 
      recentArrivals.some(p => p.id === a.receiverId)
    ).length

    if (recentArrivalsReceiving > 0) {
      clues.push({
        text: `${recentArrivalsReceiving} of the most recent Montreal arrivals are receiving gifts`,
        type: 'year',
        difficulty: 'medium'
      })
    }
  }

  // Filter out any obviously predictable backup clues too
  const nonObviousBackups = clues.filter(clue => 
    !isClueObvious(clue, assignments, participantMap, analysis, exclusions)
  )

  return nonObviousBackups.slice(0, needed)
}

