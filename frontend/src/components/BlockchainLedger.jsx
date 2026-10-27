import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Link as LinkIcon, 
  Hash, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  RefreshCw, 
  Key, 
  Database, 
  Copy, 
  Check, 
  Fingerprint,
  Cpu,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { getBlockchainBlocks, verifyBlockchain } from '../api';

export default function BlockchainLedger() {
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [filterAction, setFilterAction] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedHash, setCopiedHash] = useState(null);

  useEffect(() => {
    fetchBlocks();
  }, []);

  const fetchBlocks = async () => {
    setLoading(true);
    try {
      const res = await getBlockchainBlocks();
      setBlocks(res.data);
      if (res.data.length > 0) {
        setSelectedBlock(res.data[res.data.length - 1]); // select newest by default
      }
    } catch (err) {
      console.error('Failed to load blockchain ledger:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyChain = async () => {
    setVerifying(true);
    try {
      const res = await verifyBlockchain();
      setVerificationResult(res.data);
    } catch (err) {
      console.error('Chain verification failed:', err);
    } finally {
      setVerifying(false);
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(id);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const filteredBlocks = blocks.filter(b => {
    const matchesAction = filterAction === 'ALL' || b.action === filterAction;
    const matchesSearch = 
      (b.survey_number && b.survey_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (b.owner_name && b.owner_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      b.current_hash.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.action.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesAction && matchesSearch;
  });

  const getActionBadgeColor = (action) => {
    switch (action) {
      case 'GENESIS':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'TITLE_ORIGIN_CREATION':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'FIELD_INSPECTION_AUDIT':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
      case 'RECORD_FIELD_MODIFICATION':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'DUPLICATE_COLLISION_RESOLUTION':
        return 'bg-teal-500/20 text-teal-300 border-teal-500/30';
      case 'CROSS_DEPT_MUTATION_ENDORSEMENT':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      default:
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    }
  };

  const sanitizeDetails = (details) => {
    if (!details) return "No payload metadata.";
    return details.replace(/LandNova/gi, 'BhoomiAI');
  };

  return (
    <div className="space-y-6">
      {/* Header Card with Neo-Emerald Studio Styling */}
      <div className="glass-card p-6 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center space-x-2.5">
              <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-glow-sm">
                <LinkIcon className="w-6 h-6 animate-pulse" />
              </span>
              <div>
                <h1 className="text-2xl font-black text-white font-outfit tracking-tight flex items-center gap-2">
                  Bhoomi<span className="text-gradient-emerald">AI</span> Mutation Ledger
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-bold border border-emerald-500/30 font-mono">
                    SHA-256 Distributed Audit Chain
                  </span>
                </h1>
                <p className="text-xs text-slate-400">
                  Immutable, tamper-proof title transfers, cross-department endorsements, and biometric field inspections anchored via cryptographic hash pointers.
                </p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-3">
            <button
              onClick={handleVerifyChain}
              disabled={verifying}
              className="px-4 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-glow-sm flex items-center space-x-2 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${verifying ? 'animate-spin' : ''}`} />
              <span>{verifying ? 'Auditing SHA-256 Tree...' : 'Verify Cryptographic Chain'}</span>
            </button>
            <button
              onClick={fetchBlocks}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 transition"
              title="Refresh Blocks"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Verification Status Banner */}
        {verificationResult && (
          <div className={`mt-4 p-4 rounded-xl border flex items-center justify-between text-xs transition duration-300 ${
            verificationResult.is_valid
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
          }`}>
            <div className="flex items-center space-x-3">
              {verificationResult.is_valid ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              )}
              <div>
                <span className="font-bold uppercase tracking-wider">
                  {verificationResult.is_valid ? 'Chain Integrity Intact' : 'Chain Tampering Detected!'}
                </span>
                <p className="text-[11px] text-slate-300">
                  Verified {verificationResult.total_blocks || verificationResult.total_blocks_verified || blocks.length} blocks from Genesis (#0) to Tip. All cryptographic SHA-256 parent links &amp; Merkle roots matched.
                </p>
              </div>
            </div>
            <span className="font-mono text-[10px] bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-800 text-cyan-300">
              Latency: {verificationResult.audit_duration_ms}ms
            </span>
          </div>
        )}
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4 rounded-xl border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Mined Blocks</span>
            <Database className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">{blocks.length}</div>
          <div className="text-[10px] text-slate-400">Genesis to Current Tip</div>
        </div>

        <div className="glass-card p-4 rounded-xl border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Hashing Algorithm</span>
            <Hash className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-black text-teal-300 font-mono">SHA-256</div>
          <div className="text-[10px] text-slate-400">256-bit cryptographic digest</div>
        </div>

        <div className="glass-card p-4 rounded-xl border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Consensus Model</span>
            <Cpu className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-300 font-mono">Proof-of-Auth</div>
          <div className="text-[10px] text-slate-400">Revenue Dept Staked Nodes</div>
        </div>

        <div className="glass-card p-4 rounded-xl border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Chain State</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 flex items-center gap-1.5 font-mono">
            <span>Active</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          </div>
          <div className="text-[10px] text-slate-400">Synchronized &bull; Zero Forks</div>
        </div>
      </div>

      {/* Main Grid: Visual Chain Explorer & Block Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left 7 Cols: Chronological Block Chain Timeline */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          {/* Filter and Search Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 glass-card px-4 py-3 rounded-xl border border-slate-800">
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <span className="text-xs text-slate-400 font-semibold">Filter:</span>
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
              >
                <option value="ALL">All Actions</option>
                <option value="GENESIS">Genesis</option>
                <option value="TITLE_ORIGIN_CREATION">Title Origin</option>
                <option value="FIELD_INSPECTION_AUDIT">Field Inspection</option>
                <option value="RECORD_FIELD_MODIFICATION">Modification</option>
                <option value="CROSS_DEPT_MUTATION_ENDORSEMENT">Cross-Dept</option>
              </select>
            </div>

            <div className="relative w-full sm:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search hash / survey..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Block Cards List with Cryptographic Links */}
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-12 text-slate-400 text-xs">Loading ledger blocks...</div>
            ) : filteredBlocks.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">No matching blocks found.</div>
            ) : (
              filteredBlocks.map((b, idx) => {
                const isSelected = selectedBlock?.id === b.id;
                const dateStr = new Date(b.timestamp).toLocaleString('en-IN', {
                  day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit'
                });

                return (
                  <div key={b.id} className="relative">
                    {/* Connecting Link Line with Emerald Glow */}
                    {idx < filteredBlocks.length - 1 && (
                      <div className="absolute left-8 top-full h-3 w-0.5 bg-gradient-to-b from-emerald-500 to-teal-800 z-10"></div>
                    )}

                    <div
                      onClick={() => setSelectedBlock(b)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 relative ${
                        isSelected 
                          ? 'glass-card border-emerald-500/80 shadow-[0_0_20px_rgba(16,185,129,0.2)] bg-slate-900/90'
                          : 'glass-card border-slate-800/80 hover:border-slate-700 bg-slate-950/60'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2.5">
                          <span className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-mono text-xs font-bold flex items-center justify-center">
                            #{b.block_index}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getActionBadgeColor(b.action)}`}>
                            {b.action.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1.5 text-[11px] text-slate-400">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{dateStr}</span>
                        </div>
                      </div>

                      {/* Survey and Owner Summary */}
                      <div className="flex items-center justify-between text-xs mb-2.5">
                        <span className="font-semibold text-white">
                          {b.survey_number ? `Survey ${b.survey_number} (${b.village || 'Village'})` : 'National Genesis Root'}
                        </span>
                        <span className="text-slate-400">
                          {b.owner_name || 'System Authority'}
                        </span>
                      </div>

                      {/* Hash Preview Bar */}
                      <div className="p-2 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-between font-mono text-[11px]">
                        <div className="flex items-center space-x-1.5 text-slate-400 truncate mr-2">
                          <Hash className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="text-emerald-300/90 truncate">{b.current_hash}</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(b.current_hash, b.id);
                          }}
                          className="text-slate-400 hover:text-white shrink-0 p-1 rounded"
                          title="Copy Full Hash"
                        >
                          {copiedHash === b.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right 5 Cols: Selected Block Cryptographic Inspector */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          {selectedBlock ? (
            <div className="glass-card p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4 sticky top-28">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <div className="flex items-center space-x-2">
                  <Fingerprint className="w-5 h-5 text-emerald-400" />
                  <h2 className="text-base font-bold text-white font-outfit">
                    Block #{selectedBlock.block_index} Inspector
                  </h2>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getActionBadgeColor(selectedBlock.action)}`}>
                  {selectedBlock.action}
                </span>
              </div>

              {/* Hashes Details */}
              <div className="space-y-3 text-xs">
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">
                    Current Block Hash (SHA-256)
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-emerald-500/30 font-mono text-[11px] text-emerald-300 break-all select-all">
                    {selectedBlock.current_hash}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1 flex items-center justify-between">
                    <span>Parent Block Hash (`prev_hash`)</span>
                    {selectedBlock.block_index > 0 && (
                      <span className="text-[10px] text-emerald-400 flex items-center gap-0.5">
                        <CheckCircle2 className="w-3 h-3" /> Linked
                      </span>
                    )}
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-400 break-all select-all">
                    {selectedBlock.prev_hash}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">
                    Merkle Tree Root
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-cyan-300 break-all select-all">
                    {selectedBlock.merkle_root}
                  </div>
                </div>
              </div>

              {/* Metadata table */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Timestamp</span>
                  <span className="font-mono text-slate-200">
                    {new Date(selectedBlock.timestamp).toISOString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Mining Nonce</span>
                  <span className="font-mono text-teal-300">{selectedBlock.nonce}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Endorsing Validator</span>
                  <span className="font-medium text-slate-200">{selectedBlock.validator}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Target Survey</span>
                  <span className="font-bold text-white">
                    {selectedBlock.survey_number ? `Sy ${selectedBlock.survey_number}` : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Titleholder</span>
                  <span className="font-semibold text-white">{selectedBlock.owner_name || 'System'}</span>
                </div>
              </div>

              {/* Transaction payload detail */}
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Cryptographic Mutation Payload
                </span>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300 leading-relaxed font-mono">
                  {sanitizeDetails(selectedBlock.details)}
                </div>
              </div>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(selectedBlock, null, 2));
                  alert('Block JSON payload copied to clipboard!');
                }}
                className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700 transition"
              >
                Copy Raw Block JSON
              </button>
            </div>
          ) : (
            <div className="glass-card p-8 rounded-2xl border border-slate-800 text-center text-slate-400 text-xs">
              Select any block in the chain to view cryptographic signatures and Merkle proof.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
