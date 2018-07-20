var Git = require("nodegit");

Git.Repository.open(".")
  .then(function(repo) {
    return repo.getMasterCommit();
  })
  .then(function(firstCommitOnMaster) {
    var history = firstCommitOnMaster.history();
    var count = 0;
    history.on("commit", function(commit) {
      if (++count >= 9) {
        return;
      }
 
      console.log("commit " + commit.sha());
      var author = commit.author();
      console.log("Author:\t" + author.name() + " <" + author.email() + ">");
      console.log("Date:\t" + commit.date());
      console.log("\n    " + commit.message());
    });
    history.start();
  });

