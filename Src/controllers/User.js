const auth = require("../middleware/auth");
const lodash = require('lodash');

//to do
// upload avatar and banner
// search / by user tag /get user by id


const userBan = async (req, auth, res) => { // doesn't delete the account just locks out everything //requires admin user
    try {
        const _id = req.params.id
        if (!req.user.adminCheck()) {
            res.status(400).send("not an admin can't process request")
        }

        const user = await User.findById(_id)

        if (! user) {
            throw new Error()
        }

        user.isBanned.status = true
        user.isBanned.banDate = Date.now()
        user.tokens = []
        await user.save()
        res.status(200).send()
    } catch (e) {
        res.status(404).send()
    }
}

const userDelete = async (req, auth, res) => { // deletes user and his tweets
    try {
        const _id = req.params.id
        if (!req.user.adminCheck() && req.user._id != _id) {
            res.status(400).send("not an admin or the user themselves can't process request")
        }

        const user = await User.findById(_id)

        if (! user) {
            throw new Error()
        }

        await tweet.deleteMany({owner: user})
        await user.delete()
        res.status(200).send()
    } catch (e) {
        res.status(404).send()
    }
}

const userFollowUnFollow = async (req, auth, res) => {
    try { // you can not follow your self
        if (req.params.id.toString() == req.user._id.toString()) {
            throw new Error("you can not follow your self ")
        }

        // find user
        const user = await User.findById(req.params.id);
        // if no user
        if (! user) {
            throw new Error("no user found");
        }
        // *check if you already follow the user
        const isfollowed = req.user.following.some((followed) => followed.followingId.toString() === req.params.id)

        if (isfollowed) { // *add to user following
            req.user.following = req.user.following.filter((follow) => {
                return follow.followingId != req.params.id;
            })
            req.user.followingcount -= 1
            await req.user.save()
            user.followercount -= 1
            await user.save()
        } else { // *add to user following
            req.user.following = req.user.following.concat({followingId: user._id})
            req.user.followingcount ++
            await req.user.save()
            user.followercount ++
            await user.save()
        }

    } catch (e) {
        res.status(400).send({error: e.toString()})
    }
}


const userGetFollowing = async (req, auth, res) => {
    try {
        const sort = [{
                createdAt: -1
            }];
        const limit = req.query.limit ? parseInt(req.query.limit) : 30;
        const skip = req.query.skip ? parseInt(req.query.skip) : 0;
        const user = await User.findOne({_id: req.params.id});
        await user.populate({
            path: "following",
            select: "_id screenName tag followercount followingcount profileAvater Biography",
            options: {
                limit: parseInt(limit), // to limit number of user
                skip: parseInt(skip),
                sort
            }
        });
        return res.status(200).send(user.following)
    } catch (e) {
        res.status(404).send()
    }
}

const userGetFollowers = async (req, auth, res) => {
    try {
        const sort = [{
                createdAt: -1
            }];
        const limit = req.query.limit ? parseInt(req.query.limit) : 30;
        const skip = req.query.skip ? parseInt(req.query.skip) : 0;
        const user = await User.findOne({_id: req.params.id});
        await user.populate({
            path: "follower",
            select: "_id screenName tag followercount followingcount profileAvater Biography",
            options: {
                limit: parseInt(limit), // to limit number of user
                skip: parseInt(skip),
                sort
            }
        });
        // to check if you follow the user or not
        if (! user.follower.length < 1) {
            user.follower = user.follower.map((follow) => {
                const isfollowed = req.user.following.some((followed) => followed.followingId.toString() == follow._id.toString());
                delete follow._doc.following;
                if (isfollowed) {
                    userFollower = {
                        ...follow._doc,
                        isfollowing: true
                    };
                    return userFollower;
                } else {
                    userFollower = {
                        ...follow._doc,
                        isfollowing: false
                    };
                    return userFollower;
                }
            });
        }

        res.send(user.follower);
    } catch (e) {
        res.status(400).send({error: e.toString()});
    }
}

const userSuggestedAccounts = async (req, auth, res) => {
    try {

        const followingsId = req.user.following.map((user) => {
            return user.followingId;
        })

        followingsId.push(req.user._id)
        let suggestedAccounts = await User.find({
            _id: {
                $nin: followingsId
            },
            isPrivate: false
        })
        suggestedAccounts = lodash.sampleSize(suggestedAccounts, 4)
        
        res.send({suggestedAccounts})

    } catch (e) {
        res.status(400).send({error: e.toString()});
    }
}

const userGetMe = async (req, auth, res) => {
    try {
      res.send(req.user);
    } catch (e) {
      res.status(400).send({ error: e.toString() });
    }
  }

module.exports = {
    userBan,
    userDelete,
    userFollowUnFollow,
    userGetFollowers,
    userGetFollowing,
    userSuggestedAccounts,
    userGetMe
}
