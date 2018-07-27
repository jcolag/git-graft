var Git = require("nodegit");

let branches = {};

Git.Repository.open(".")
  .then(function(repo) {
    return { names: repo.getReferenceNames(Git.Reference.TYPE.LISTALL), repo };
  }).then(function(r) {
    let { names, repo } = r;
    names.then(function(nn) {
      for (let ni = 0; ni < nn.length; ni++) {
        let name = nn[ni];
        branches[name] = [];
        try {
        repo.getBranchCommit(name).then(function(firstCommit) {
          let history = firstCommit.history();
          let count = 0;
          history.on("commit", function(commit) {
            branches[name].push(commit);
            /*
            if (++count >= 5) {
              return;
            }
            console.log(`[[Branch: ${name}]]`)
            console.log("commit " + commit.sha());
            var author = commit.author();
            console.log("Author:\t" + author.name() + " <" + author.email() + ">");
            console.log("Date:\t" + commit.date());
            console.log("\n    " + commit.message());
            */
          });
          history.start();
        });
        } catch(e) {
        console.log(e);
        }
      }
    });
  });

