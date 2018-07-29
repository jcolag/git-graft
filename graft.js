var Git = require("nodegit");

let branches = {};
let semaphore = 0;
let intervalId = 0;

Git.Repository.open(".")
  .then(function(repo) {
    return { names: repo.getReferenceNames(Git.Reference.TYPE.LISTALL), repo };
  }).then(function(r) {
    let { names, repo } = r;
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

function reportBranches() {
  if (semaphore > 0) {
    return;
  }
  clearInterval(intervalId);
  let keys = Object.keys(branches).filter(b => b.indexOf("remotes") < 0);
  for (let k = 0; k < keys.length; k++) {
    let branch = keys[k];
    let commits = branches[branch];
    console.log(`\n[[Branch:  ${branch}]]`);
    for (let c = 0; c < commits.length; c++) {
      let commit = commits[c];
      console.log(`\ncommit\t${commit.sha()}`);
      var author = commit.author();
      console.log(`Author:\t${author.name()} <${author.email()}>`);
      console.log(`Date:\t${commit.date()}`);
      console.log(`\n\t${commit.message().trim()}`);
    }
  }
}
