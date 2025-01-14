import { withPluginApi } from "discourse/lib/plugin-api";
import showModal from "discourse/lib/show-modal";
import { renderIcon } from "discourse-common/lib/icon-library";

function initializeDiscourseVideo(api) {
  const siteSettings = api.container.lookup("site-settings:main");

  function renderVideo($container, videoId) {
    $container.removeAttr("data-video-id");
    const $videoElem = $("<iframe/>").attr({
      src: `${Discourse.BaseUri}/discourse_video/${videoId}`,
      class: "discourse_video"
    });
    $container.html($videoElem);
  }

  const placeholders = {
    pending: {
      iconHtml: "<div class='spinner'></div>",
      string: I18n.t("discourse_video.state.pending")
    },
    waiting: {
      iconHtml: "<div class='spinner'></div>",
      string: I18n.t("discourse_video.state.pending")
    },
    errored: {
      iconHtml: renderIcon("string", "exclamation-triangle"),
      string: I18n.t("discourse_video.state.errored")
    },
    unknown: {
      iconHtml: renderIcon("string", "question-circle"),
      string: I18n.t("discourse_video.state.unknown")
    }
  };

  function renderPlaceholder($container, type) {
    $container.html(
      `<div class='icon-container'><span class='discourse-video-message'>${
        placeholders[type].iconHtml
      } ${placeholders[type].string}</span></div>`
    );
  }

  function renderVideos($elem, post) {
    $("div[data-video-id]", $elem).each((index, container) => {
      const $container = $(container);
      const video_id = $container.data("video-id").toString();
      if (!post.discourse_video_videos) return;

      const video_string = post.discourse_video_videos.find(v => {
        return v.indexOf(`${video_id}:`) === 0;
      });

      if (video_string) {
        const status = video_string.replace(`${video_id}:`, "");
        if (status === "ready") {
          renderVideo($container, video_id);
        } else if (status === "errored") {
          renderPlaceholder($container, "errored");
        } else if (status === "waiting") {
          renderPlaceholder($container, "waiting");
        } else {
          renderPlaceholder($container, "pending");
        }
      } else {
        renderPlaceholder($container, "unknown");
      }
    });
  }

  api.decorateCooked(($elem, helper) => {
    if (helper) {
      const post = helper.getModel();
      renderVideos($elem, post);
    } else {
      $("div[data-video-id]", $elem).html(
        `<div class='icon-container'>${renderIcon("string", "video")}</div>`
      );
    }
  });

  api.registerCustomPostMessageCallback(
    "discourse_video_video_changed",
    (topicController, message) => {
      let stream = topicController.get("model.postStream");
      const post = stream.findLoadedPost(message.id);
      stream.triggerChangedPost(message.id).then(() => {
        const $post = $(`article[data-post-id=${message.id}]`);
        renderVideos($post, post);
      });
    }
  );

  api.addComposerUploadHandler(
    siteSettings.discourse_video_file_extensions.split("|"),
    file => {
      Ember.run.next(() => {
        const user = api.getCurrentUser();
        if (
          user.trust_level >= siteSettings.discourse_video_min_trust_level ||
          user.staff
        ) {
          showModal("discourse-video-upload-modal").setProperties({
            file
          });
        } else {
          //bootbox.alert(
          //  I18n.t("discourse_video.not_allowed", {
          //    trust_level: siteSettings.discourse_video_min_trust_level,
          //    trust_level_description: Discourse.Site.currentProp("trustLevels")
          //      .findBy("id", siteSettings.discourse_video_min_trust_level)
          //      .get("name")
          //  })
          //);
        }
      });
    }
  );

  api.onToolbarCreate(toolbar => {
    toolbar.addButton({
      id: "discourse-video-upload",
      group: "insertions",
      icon: "video",
      title: "discourse_video.upload_toolbar_title",
      perform: () => {
        showModal("discourse-video-upload-modal");
      }
    });
  });

}

export default {
  name: "discourse-video",

  initialize(container) {
    const siteSettings = container.lookup("site-settings:main");

    if (siteSettings.discourse_video_enabled) {
      withPluginApi("0.8.31", initializeDiscourseVideo);
    }
  }
};
