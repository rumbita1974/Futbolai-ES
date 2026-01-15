import type { NextApiRequest, NextApiResponse } from 'next';
import { fetchVerifiedSquad } from '@/services/optimizedDataService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    console.log('\n========== DEBUG: Real Madrid Squad ==========\n');
    
    const squadData = await fetchVerifiedSquad('real madrid');
    
    if (!squadData || !squadData.squad) {
      return res.status(200).json({
        error: 'No squad data returned',
        teamName: squadData?.name,
        squadLength: squadData?.squad?.length
      });
    }
    
    console.log(`Team: ${squadData.name}`);
    console.log(`Coach: ${squadData.coach?.name}`);
    console.log(`Players: ${squadData.squad.length}`);
    console.log('\nPlayer List:');
    squadData.squad.forEach((p: any, i: number) => {
      console.log(`  ${i+1}. ${p.name} (${p.position})`);
    });
    
    // Check for Mbappé variations
    const mbappe = squadData.squad.find((p: any) => 
      p.name?.toLowerCase().includes('mbappe') || 
      p.name?.toLowerCase().includes('kylian')
    );
    
    if (mbappe) {
      console.log(`\n✅ MBAPPÉ FOUND: ${mbappe.name}`);
    } else {
      console.log(`\n❌ MBAPPÉ NOT FOUND in squad`);
    }
    
    res.status(200).json({
      team: squadData.name,
      coach: squadData.coach?.name,
      totalPlayers: squadData.squad.length,
      players: squadData.squad.map((p: any) => ({
        name: p.name,
        position: p.position,
        nationality: p.nationality
      })),
      mbappe: mbappe ? {
        name: mbappe.name,
        position: mbappe.position,
        nationality: mbappe.nationality
      } : 'NOT FOUND'
    });
    
  } catch (error) {
    console.error('❌ ERROR:', error);
    res.status(500).json({ error: (error as any).message });
  }
}
