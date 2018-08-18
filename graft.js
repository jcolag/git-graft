const Git = require("nodegit");
const commandLineArgs = require('command-line-args');

const optionDefinitions = [
  { name: 'source', alias: 's', type: String },
  { name: 'target', alias: 't', type: String },
];
const options = commandLineArgs(optionDefinitions);

if (!options.hasOwnProperty('source')) {
  // Can't function without the branches
  listBranches();
}

const sourceBranch = options.source;
let targetBranch = options.hasOwnProperty('target') ? options.target : '';
let branches = {};
let semaphore = 0;
let intervalId = 0;

Git.Repository.open(".")
  .then(function(repo) {
    return {
      names: repo.getReferenceNames(Git.Reference.TYPE.LISTALL),
      repo
    };
  }).then(function(r) {
    let { names, repo } = r;
    repo.getCurrentBranch().then((branch) => {
      if (!targetBranch) {
        targetBranch = branch;
      }
      if (targetBranch === branch) {
        getCommits(repo, names);
      } else {
        repo.getReference(targetBranch).then((ref) => {
          repo.checkoutRef(ref).then(() => {
            getCommits(repo, names);
          });
        });
      }
    });
  });

function getCommits(repo, names) {
  names.then(function(nn) {
    semaphore = nn.length;
    intervalId = setInterval(pickAlongBranch, 100, repo);
    for (let ni = 0; ni < nn.length; ni++) {
      let name = nn[ni];
      branches[name] = [];
      try {
        repo.getBranchCommit(name).then((firstCommit) => {
          let history = firstCommit.history();
          history.on("commit", function(commit) {
            branches[name].unshift(commit);
          });
          history.start();
        }).then(function() {
          --semaphore;
        });
      } catch(e) {
        console.log(e);
      }
    }
  });
}

async function pickAlongBranch(repo) {
  if (semaphore > 0) {
    return;
  }
  clearInterval(intervalId);
  const tarCommits = branches[targetBranch].map(c => c.sha());
  const srcCommits = branches[sourceBranch];
  const options = new Git.CherrypickOptions();
  for (let c = 0; c < srcCommits.length; c++) {
    const commit = srcCommits[c];
    const sha = commit.sha();
    let cherryPickDone = false;
    if (tarCommits.indexOf(sha)) {
      continue;
    }
    repo.getCommit(sha).then((commit) => {
      Git.Cherrypick.cherrypick(repo, commit, options).then((r) => {
        let status = r < 0 ? "failed" : "succeeded";
        console.log(`${sha} ... ${status}`);
        cherryPickDone = true;
      });
    });
    while (!cherryPickDone) {
      await sleep(100);
    }
  }
}

function listBranches() {
  let currentBranch = "";
  let names = Git.Repository.open(".")
    .then(function(repo) {
      repo.getCurrentBranch()
        .then(function(ref) {
         currentBranch = ref.name();
       });
      return repo.getReferenceNames(Git.Reference.TYPE.LISTALL);
    });
  names.then((nn) => {
    console.log("Available branches:");
    for (let i = 0; i < nn.length; i++) {
      let isCurrent = nn[i] === currentBranch ? " *" : "";
      console.log(`\t${nn[i]}${isCurrent}`);
    }
    process.exit();
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

