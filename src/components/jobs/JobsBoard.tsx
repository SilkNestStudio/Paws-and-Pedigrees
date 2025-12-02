import { useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { jobTypes } from '../../data/jobTypes';
import HelpButton from '../tutorial/HelpButton';
import { applyJobIncomeBonus } from '../../utils/kennelUpgrades';
import { showToast } from '../../lib/toast';

export default function JobsBoard() {
  const { user, updateUserCash } = useGameStore();
  const [workingJob, setWorkingJob] = useState<string | null>(null);
  const [jobsCompleted, setJobsCompleted] = useState<{ [key: string]: number }>({});

  const calculatePay = (job: typeof jobTypes[0]): number => {
    let pay = job.basePay;

    // Apply skill bonus
    if (job.skillType && user) {
      const skillValue = user[job.skillType] || 1;
      const bonus = skillValue / 100;
      pay = Math.round(pay * (1 + bonus));
    }

    // Apply kennel level bonus
    if (user) {
      pay = applyJobIncomeBonus(pay, user.kennel_level);
    }

    return pay;
  };

  const handleStartJob = (jobId: string) => {
    const job = jobTypes.find(j => j.id === jobId);
    if (!job) return;

    const completed = jobsCompleted[jobId] || 0;
    if (completed >= job.dailyLimit) {
      showToast.warning(`You've completed this job ${job.dailyLimit} times today. Come back tomorrow!`);
      return;
    }

    setWorkingJob(jobId);

    setTimeout(() => {
      const pay = calculatePay(job);
      updateUserCash(pay);
      setJobsCompleted(prev => ({ ...prev, [jobId]: (prev[jobId] || 0) + 1 }));
      setWorkingJob(null);
      showToast.success(`Job complete! Earned $${pay}`);
    }, job.duration * 1000);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-6 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <h2 className="text-2xl font-bold text-earth-900">Jobs Board</h2>
          <HelpButton helpId="jobs-daily-limits" tooltip="Learn about jobs" />
        </div>
        <p className="text-earth-600">Earn extra cash between competitions</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {jobTypes.map((job) => {
          const isUnlocked = (user?.level || 1) >= job.unlockLevel;
          const completed = jobsCompleted[job.id] || 0;
          const canDo = completed < job.dailyLimit;
          const pay = calculatePay(job);

          return (
            <div
              key={job.id}
              className={`bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-6 ${
                !isUnlocked ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{job.icon}</span>
                  <div>
                    <h3 className="text-xl font-bold text-earth-900">{job.name}</h3>
                    <p className="text-sm text-earth-600">{job.description}</p>
                  </div>
                </div>
                {!isUnlocked && <span className="text-2xl">🔒</span>}
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-earth-600">Pay:</span>
                  <span className="font-bold text-green-600">${pay}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-earth-600">Duration:</span>
                  <span className="text-earth-800">{job.duration}s</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-earth-600">Completed Today:</span>
                  <span className="text-earth-800">{completed}/{job.dailyLimit}</span>
                </div>
                {job.skillType && (
                  <div className="flex justify-between text-sm">
                    <span className="text-earth-600">Skill Bonus:</span>
                    <span className="text-earth-800">+{((user?.[job.skillType] || 1) / 100 * 100).toFixed(0)}%</span>
                  </div>
                )}
              </div>

              {!isUnlocked ? (
                <div className="text-center py-2 bg-earth-100 rounded text-sm text-earth-600">
                  Unlocks at Level {job.unlockLevel}
                </div>
              ) : !canDo ? (
                <div className="text-center py-2 bg-yellow-100 rounded text-sm text-yellow-800">
                  Daily limit reached
                </div>
              ) : (
                <button
                  onClick={() => handleStartJob(job.id)}
                  disabled={workingJob !== null}
                  className="w-full py-3 bg-kennel-600 text-white rounded-lg hover:bg-kennel-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-bold"
                >
                  {workingJob === job.id ? 'Working...' : 'Start Job'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {workingJob && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 text-center">
            <p className="text-2xl font-bold text-earth-900 mb-4">Working...</p>
            <div className="text-6xl animate-bounce">
              {jobTypes.find(j => j.id === workingJob)?.icon}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
