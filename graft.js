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
  return;
}

const sourceBranch = options.source;
let targetBranch = Object.hasOwnProperty('target') ? options.target : '';
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
    let { names, branch, repo } = r;
    repo.getCurrentBranch().then((branch) => {
      if (!targetBranch) {
        targetBranch = branch;
      }
      names.then(function(nn) {
        semaphore = nn.length;
        intervalId = setInterval(reportBranches, 100);
        for (let ni = 0; ni < nn.length; ni++) {
          let name = nn[ni];
          branches[name] = [];
          try {
            repo.getBranchCommit(name).then(function(firstCommit) {
              let history = firstCommit.history();
              let count = 0;
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
    });
  });

function reportBranches() {
  if (semaphore > 0) {
    return;
  }
  clearInterval(intervalId);
  const tarCommits = branches[targetBranch].map(c => c.sha());
  const srcCommits = branches[sourceBranch];
  console.log(`\n[[Unique to branch ${sourceBranch}]]`);
  for (let c = 0; c < srcCommits.length; c++) {
    const commit = srcCommits[c];
    const sha = commit.sha();
    const author = commit.author();
    if (tarCommits.indexOf(sha)) {
      continue;
    }
    console.log(`\ncommit\t${sha}`);
    console.log(`Author:\t${author.name()} <${author.email()}>`);
    console.log(`Date:\t${commit.date()}`);
    console.log(`\n\t${commit.message().trim()}`);
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
  });
}

