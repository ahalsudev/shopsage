#!/usr/bin/env node

/**
 * Script to sync program IDs from Anchor.toml to mobile app constants
 * Usage: node scripts/sync-program-ids.js [--network localnet|devnet]
 */

const fs = require('fs')
const path = require('path')
const process = require('process')

// Parse command line arguments
const args = process.argv.slice(2)
const networkIndex = args.indexOf('--network')
const targetNetwork = networkIndex !== -1 ? args[networkIndex + 1] : 'localnet'

// Paths
const ANCHOR_TOML_PATH = '../shopsage-solana/Anchor.toml'
const PROGRAMS_TS_PATH = './constants/programs.ts'
const DEPLOY_RESULT_PATH = '../shopsage-solana/DEPLOY_RESULT.md'

function parseAnchorToml(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    const programIds = {}
    
    // Parse [programs.localnet] section
    const localnetMatch = content.match(/\[programs\.localnet\]([\s\S]*?)(?=\[|\s*$)/)
    if (localnetMatch) {
      const localnetSection = localnetMatch[1]
      const programMatches = localnetSection.matchAll(/(\w+)\s*=\s*"([^"]+)"/g)
      
      for (const match of programMatches) {
        const [, programName, programId] = match
        programIds[programName] = programId
      }
    }
    
    return programIds
  } catch (error) {
    console.error('Error reading Anchor.toml:', error.message)
    return null
  }
}

function parseDeployResult(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    const programIds = {}
    
    // Parse deployment results
    const deployMatches = content.matchAll(/Deploying program "([^"]+)"[\s\S]*?Program Id: (\w+)/g)
    
    for (const match of deployMatches) {
      const [, programName, programId] = match
      programIds[programName] = programId
    }
    
    return programIds
  } catch (error) {
    console.warn('Deploy result file not found, using Anchor.toml only')
    return {}
  }
}

function updateProgramsTs(programIds, network) {
  try {
    let content = fs.readFileSync(PROGRAMS_TS_PATH, 'utf8')
    
    // Convert program names to match TypeScript constants
    const tsMap = {
      'shopsage_payment': 'SHOPSAGE_PAYMENT',
      'shopsage_session': 'SHOPSAGE_SESSION', 
      'shopsage_expert': 'SHOPSAGE_EXPERT'
    }
    
    // Update each program ID for the target network
    for (const [programName, programId] of Object.entries(programIds)) {
      const tsName = tsMap[programName]
      if (!tsName) continue
      
      const regex = new RegExp(
        `(${network}:\\s*{[\\s\\S]*?)${tsName}:\\s*new PublicKey\\(['"]['"]?[\\w]+['"]?['"']\\)`,
        'g'
      )
      
      content = content.replace(
        regex,
        `$1${tsName}: new PublicKey('${programId}')`
      )
    }
    
    fs.writeFileSync(PROGRAMS_TS_PATH, content)
    console.log(`✅ Updated program IDs for ${network} network`)
    
    // Log the updates
    for (const [programName, programId] of Object.entries(programIds)) {
      const tsName = tsMap[programName]
      if (tsName) {
        console.log(`   ${tsName}: ${programId}`)
      }
    }
    
  } catch (error) {
    console.error('Error updating programs.ts:', error.message)
  }
}

function main() {
  console.log('🔄 Syncing program IDs from Solana programs...')
  console.log(`Target network: ${targetNetwork}`)
  
  // Try to get program IDs from deployment result first, then Anchor.toml
  const deployIds = parseDeployResult(DEPLOY_RESULT_PATH)
  const anchorIds = parseAnchorToml(ANCHOR_TOML_PATH)
  
  if (!anchorIds && Object.keys(deployIds).length === 0) {
    console.error('❌ Could not read program IDs from any source')
    process.exit(1)
  }
  
  // Use deploy result if available, otherwise fall back to Anchor.toml
  const programIds = Object.keys(deployIds).length > 0 ? deployIds : anchorIds
  
  console.log('\n📋 Found program IDs:')
  for (const [name, id] of Object.entries(programIds)) {
    console.log(`   ${name}: ${id}`)
  }
  
  updateProgramsTs(programIds, targetNetwork)
  
  console.log('\n✨ Program ID sync completed!')
}

// Check if paths exist
if (!fs.existsSync(path.resolve(ANCHOR_TOML_PATH))) {
  console.error(`❌ Anchor.toml not found at: ${ANCHOR_TOML_PATH}`)
  console.error('Make sure you run this script from the mobile app directory')
  process.exit(1)
}

if (!fs.existsSync(PROGRAMS_TS_PATH)) {
  console.error(`❌ programs.ts not found at: ${PROGRAMS_TS_PATH}`)
  process.exit(1)
}

main()