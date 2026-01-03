/**
 * World Cup 2026 Data Service
 */

const API_BASE = typeof window !== 'undefined' ? '' : 'http://localhost:3000';

export const fetchWorldCupData = async () => {
  try {
    const response = await fetch(`${API_BASE}/api/worldcup`, {
      cache: 'no-store'
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to load World Cup data');
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching World Cup data:', error);
    
    // Return fallback data if API fails
    return {
      success: false,
      error: error.message,
      groups: [],
      tournamentStart: '2026-06-11',
      totalMatches: 0
    };
  }
};

export const getGroupById = async (groupId) => {
  try {
    const data = await fetchWorldCupData();
    
    if (!data.success) {
      throw new Error(data.error);
    }
    
    const group = data.groups.find(g => g.id === groupId.toUpperCase());
    
    if (!group) {
      throw new Error(`Group ${groupId} not found`);
    }
    
    return group;
  } catch (error) {
    console.error(`Error getting group ${groupId}:`, error);
    throw error;
  }
};

export const getAllGroups = async () => {
  try {
    const data = await fetchWorldCupData();
    
    if (!data.success) {
      throw new Error(data.error);
    }
    
    return data.groups;
  } catch (error) {
    console.error('Error getting all groups:', error);
    throw error;
  }
};

export const getMatchesByDate = async (dateString) => {
  try {
    const data = await fetchWorldCupData();
    
    if (!data.success) {
      throw new Error(data.error);
    }
    
    const targetDate = new Date(dateString).toDateString();
    const allMatches = data.groups.flatMap(group => group.matches);
    
    return allMatches.filter(match => {
      const matchDate = new Date(match.date).toDateString();
      return matchDate === targetDate;
    });
  } catch (error) {
    console.error(`Error getting matches for ${dateString}:`, error);
    throw error;
  }
};

// Default export for compatibility
export default {
  fetchWorldCupData,
  getGroupById,
  getAllGroups,
  getMatchesByDate
};