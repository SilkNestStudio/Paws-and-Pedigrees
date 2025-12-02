import React, { useState } from 'react';
import { StaffMember, StaffTemplate } from '../../types/staff';
import { STAFF_TEMPLATES, getAffordableStaff, calculateDailyWages } from '../../data/staffTemplates';
import { Dog } from '../../types';

interface StaffManagementViewProps {
  staff: StaffMember[];
  userCash: number;
  userLevel: number;
  kennelLevel: number;
  userDogs: Dog[];
  onHireStaff: (template: StaffTemplate) => void;
  onFireStaff: (staffId: string) => void;
  onAssignDog: (staffId: string, dogId: string) => void;
  onUnassignDog: (staffId: string, dogId: string) => void;
}

export const StaffManagementView: React.FC<StaffManagementViewProps> = ({
  staff,
  userCash,
  userLevel,
  kennelLevel,
  userDogs,
  onHireStaff,
  onFireStaff,
  onAssignDog: _onAssignDog,
  onUnassignDog,
}) => {
  const [selectedTab, setSelectedTab] = useState<'current' | 'hire'>('current');
  const [selectedRole, setSelectedRole] = useState<string>('all');

  const affordableStaff = getAffordableStaff(userCash, userLevel, kennelLevel);
  const dailyWages = calculateDailyWages(staff);

  const filteredTemplates = selectedRole === 'all'
    ? affordableStaff
    : affordableStaff.filter(t => t.role === selectedRole);

  const renderStaffMemberCard = (member: StaffMember) => {
    return (
      <div key={member.id} className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center">
            <span className="text-3xl mr-3">{STAFF_TEMPLATES.find(t => t.role === member.role)?.icon || '👤'}</span>
            <div>
              <h3 className="text-lg font-bold text-gray-800">{member.name}</h3>
              <p className="text-sm text-gray-600 capitalize">{member.role.replace('_', ' ')}</p>
              <div className="flex items-center mt-1">
                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                  member.quality === 'master' ? 'bg-purple-100 text-purple-800' :
                  member.quality === 'expert' ? 'bg-blue-100 text-blue-800' :
                  member.quality === 'experienced' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {member.quality}
                </span>
                <span className="ml-2 text-xs text-gray-500">Level {member.level}</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => onFireStaff(member.id)}
            className="text-red-600 hover:text-red-800 text-sm font-semibold"
          >
            Fire
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-gray-50 p-2 rounded text-center">
            <p className="text-xs text-gray-500">Efficiency</p>
            <p className="font-semibold">{(member.efficiency * 100).toFixed(0)}%</p>
          </div>
          <div className="bg-gray-50 p-2 rounded text-center">
            <p className="text-xs text-gray-500">Reliability</p>
            <p className="font-semibold">{member.reliability}%</p>
          </div>
          <div className="bg-gray-50 p-2 rounded text-center">
            <p className="text-xs text-gray-500">Daily Wage</p>
            <p className="font-semibold text-orange-600">${member.dailyWage}</p>
          </div>
        </div>

        {/* Performance */}
        <div className="mb-4 text-sm">
          <p className="text-gray-600">
            <span className="font-semibold">{member.tasksCompleted}</span> tasks completed
          </p>
          <p className="text-gray-600">
            <span className="font-semibold">{member.daysWorked}</span> days worked
          </p>
        </div>

        {/* Assigned Dogs */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">
            Assigned Dogs ({member.assignedDogs?.length || 0}/{STAFF_TEMPLATES.find(t => t.role === member.role)?.maxDogs || 0})
          </p>
          <div className="space-y-1">
            {member.assignedDogs && member.assignedDogs.length > 0 ? (
              member.assignedDogs.map(dogId => {
                const dog = userDogs.find(d => d.id === dogId);
                return (
                  <div key={dogId} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                    <span className="text-sm">{dog?.name || 'Unknown Dog'}</span>
                    <button
                      onClick={() => onUnassignDog(member.id, dogId)}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      Unassign
                    </button>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-gray-400 italic">No dogs assigned</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderStaffTemplate = (template: StaffTemplate) => {
    const canAfford = userCash >= template.hiringCost;
    const meetsLevel = userLevel >= template.unlockLevel;
    const meetsKennelLevel = kennelLevel >= template.kennelLevelRequired;
    const canHire = canAfford && meetsLevel && meetsKennelLevel;

    return (
      <div key={`${template.role}-${template.quality}`} className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-start mb-4">
          <span className="text-3xl mr-3">{template.icon}</span>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-800">{template.name}</h3>
            <p className="text-sm text-gray-600 capitalize">{template.role.replace('_', ' ')}</p>
            <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-semibold ${
              template.quality === 'master' ? 'bg-purple-100 text-purple-800' :
              template.quality === 'expert' ? 'bg-blue-100 text-blue-800' :
              template.quality === 'experienced' ? 'bg-green-100 text-green-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {template.quality}
            </span>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-4">{template.description}</p>

        {/* Costs and Stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-blue-50 p-2 rounded">
            <p className="text-xs text-gray-600">Hiring Cost</p>
            <p className={`font-semibold ${canAfford ? 'text-blue-700' : 'text-red-600'}`}>
              ${template.hiringCost}
            </p>
          </div>
          <div className="bg-orange-50 p-2 rounded">
            <p className="text-xs text-gray-600">Daily Wage</p>
            <p className="font-semibold text-orange-700">${template.dailyWage}</p>
          </div>
          <div className="bg-gray-50 p-2 rounded">
            <p className="text-xs text-gray-600">Efficiency</p>
            <p className="font-semibold">{(template.efficiency * 100).toFixed(0)}%</p>
          </div>
          <div className="bg-gray-50 p-2 rounded">
            <p className="text-xs text-gray-600">Max Dogs</p>
            <p className="font-semibold">{template.maxDogs}</p>
          </div>
        </div>

        {/* Benefits */}
        <div className="mb-4">
          <p className="text-sm font-semibold text-gray-700 mb-2">Benefits:</p>
          <ul className="space-y-1">
            {template.benefits.map((benefit, index) => (
              <li key={index} className="text-xs text-gray-600 flex items-start">
                <span className="text-green-500 mr-1">✓</span>
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Special Ability */}
        {template.specialAbility && (
          <div className="mb-4 bg-purple-50 p-3 rounded">
            <p className="text-xs font-semibold text-purple-800 mb-1">Special Ability:</p>
            <p className="text-xs text-purple-700">{template.specialAbility}</p>
          </div>
        )}

        {/* Requirements */}
        <div className="mb-4 text-xs space-y-1">
          <p className={meetsLevel ? 'text-green-600' : 'text-red-600'}>
            {meetsLevel ? '✓' : '✗'} Requires Level {template.unlockLevel}
          </p>
          <p className={meetsKennelLevel ? 'text-green-600' : 'text-red-600'}>
            {meetsKennelLevel ? '✓' : '✗'} Requires Kennel Level {template.kennelLevelRequired}
          </p>
        </div>

        {/* Hire Button */}
        <button
          onClick={() => canHire && onHireStaff(template)}
          disabled={!canHire}
          className={`w-full py-2 rounded-lg font-semibold transition-colors ${
            canHire
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {!meetsLevel ? 'Level Too Low' :
           !meetsKennelLevel ? 'Kennel Level Too Low' :
           !canAfford ? 'Cannot Afford' :
           'Hire Staff'}
        </button>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Kennel Staff</h1>
        <p className="text-gray-600">Hire staff to automate care and improve your kennel operations</p>
        <div className="mt-4 flex items-center space-x-6">
          <div className="bg-white rounded-lg shadow px-4 py-2">
            <p className="text-sm text-gray-500">Current Staff</p>
            <p className="text-xl font-bold text-gray-800">{staff.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow px-4 py-2">
            <p className="text-sm text-gray-500">Daily Wages</p>
            <p className="text-xl font-bold text-orange-600">${dailyWages}</p>
          </div>
          <div className="bg-white rounded-lg shadow px-4 py-2">
            <p className="text-sm text-gray-500">Your Cash</p>
            <p className="text-xl font-bold text-green-600">${userCash}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-4 mb-6 border-b">
        <button
          onClick={() => setSelectedTab('current')}
          className={`px-4 py-2 font-semibold transition-colors ${
            selectedTab === 'current'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Current Staff ({staff.length})
        </button>
        <button
          onClick={() => setSelectedTab('hire')}
          className={`px-4 py-2 font-semibold transition-colors ${
            selectedTab === 'hire'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Hire Staff
        </button>
      </div>

      {/* Role Filter (only for hire tab) */}
      {selectedTab === 'hire' && (
        <div className="mb-6 flex flex-wrap gap-2">
          {['all', 'trainer', 'groomer', 'caretaker', 'vet_assistant', 'nutritionist', 'handler', 'kennel_manager'].map(role => (
            <button
              key={role}
              onClick={() => setSelectedRole(role)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                selectedRole === role
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {role === 'all' ? 'All Roles' : role.replace('_', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
            </button>
          ))}
        </div>
      )}

      {/* Staff List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {selectedTab === 'current' && (
          staff.length === 0 ? (
            <div className="col-span-3 text-center py-12 text-gray-500">
              <p className="mb-4">You haven't hired any staff yet</p>
              <button
                onClick={() => setSelectedTab('hire')}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Browse Available Staff
              </button>
            </div>
          ) : (
            staff.map(renderStaffMemberCard)
          )
        )}
        {selectedTab === 'hire' && filteredTemplates.map(renderStaffTemplate)}
      </div>
    </div>
  );
};
